import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TravoLivePayload, TravoWeight } from "../../src/features/travo/schema";
import { Prisma } from "../../src/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  states: new Map<string, { critical: boolean; awaitingNormal: boolean; observedAt: Date }>(),
  logs: [] as { action: string; target: string; details: { status: string } }[],
  failures: [] as Error[],
  attempts: 0
}));

vi.mock("@/features/indicator-thresholds/store", async () => {
  const { indicators: definitions } = await import("@/config/ops-eng/indicators");
  return { listIndicatorThresholds: async () => definitions.map(({ key, bands }) => ({ key, bands })) };
});

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    $transaction: async (run: (tx: object) => Promise<void>) => {
      mocks.attempts += 1;
      const error = mocks.failures.shift();
      if (error) throw error;
      return run({
      $executeRaw: async (_query: TemplateStringsArray, unit: number, key: string, initial: Date) => {
        const id = `${unit}:${key}`;
        if (!mocks.states.has(id)) mocks.states.set(id, { critical: false, awaitingNormal: false, observedAt: initial });
      },
      $queryRaw: async (_query: TemplateStringsArray, unit: number, key: string) => [mocks.states.get(`${unit}:${key}`)],
      travoAlertState: {
        update: async ({ where, data }: { where: { unit_key: { unit: number; key: string } }; data: { critical: boolean; awaitingNormal: boolean; observedAt: Date } }) => {
          mocks.states.set(`${where.unit_key.unit}:${where.unit_key.key}`, data);
        }
      },
      auditLog: { create: async ({ data }: { data: typeof mocks.logs[number] }) => { mocks.logs.push(data); } }
      });
    }
  })
}));

import { recordTravoAlertTransitions } from "../../src/features/travo/alert-log";

function payload(unit: number, voltage: number | string, timestamp: string): TravoLivePayload {
  const phase = { v: 234, i: 100, kw: 0, pf: 1, vl: 0, vbar: 0, ibar: 0 };
  const weight: TravoWeight = {
    energy: 0, pt: 0, pft: 0.95, freq: 50, dem: 0,
    l1: { ...phase, v: voltage }, l2: phase, l3: phase,
    Zpt: 0, Zqt: 0, Zst: 0, imbalance: 0
  };
  return { unit, machineId: "test", port: "1234", timestamp, rawWeight: weight, processedWeight: weight };
}

describe("Travo alert audit", () => {
  beforeEach(() => {
    mocks.states.clear();
    mocks.logs.length = 0;
    mocks.failures.length = 0;
    mocks.attempts = 0;
  });

  it("records transitions once per unit, including return to warning and re-entry", async () => {
    const time = Date.parse("2026-11-20T06:00:00Z");
    const at = (seconds: number) => new Date(time + seconds * 1000).toISOString();
    await recordTravoAlertTransitions(payload(4, 224, at(0)), time);
    await recordTravoAlertTransitions(payload(4, 224, at(0)), time);
    await recordTravoAlertTransitions(payload(1, 224, at(1)), time + 1000);
    await recordTravoAlertTransitions(payload(4, 228, at(2)), time + 2000);
    await recordTravoAlertTransitions(payload(4, 224, at(3)), time + 3000);
    await recordTravoAlertTransitions(payload(4, 228, at(4)), time + 4000);
    await recordTravoAlertTransitions(payload(4, 234, at(5)), time + 5000);
    await recordTravoAlertTransitions(payload(4, 234, at(6)), time + 6000);
    expect(mocks.logs.map(({ action, target, details }) => [action, target, details.status])).toEqual([
      ["alert.critical", "travo:4:panel.phase.r.voltage", "critical"],
      ["alert.critical", "travo:1:panel.phase.r.voltage", "critical"],
      ["alert.exit", "travo:4:panel.phase.r.voltage", "warning"],
      ["alert.critical", "travo:4:panel.phase.r.voltage", "critical"],
      ["alert.exit", "travo:4:panel.phase.r.voltage", "warning"],
      ["alert.normal", "travo:4:panel.phase.r.voltage", "on_target"]
    ]);
  });

  it("records normal immediately when a critical reading recovers directly", async () => {
    const time = Date.parse("2026-11-20T06:00:00Z");
    await recordTravoAlertTransitions(payload(1, 224, new Date(time).toISOString()), time);
    await recordTravoAlertTransitions(payload(1, 234, new Date(time + 1000).toISOString()), time + 1000);
    expect(mocks.logs.map(({ action }) => action)).toEqual(["alert.critical", "alert.exit", "alert.normal"]);
  });

  it("does not treat stale or out-of-order data as recovery", async () => {
    const time = Date.parse("2026-11-20T06:00:00Z");
    const latest = new Date(time).toISOString();
    await recordTravoAlertTransitions(payload(1, 224, latest), time);
    await recordTravoAlertTransitions(payload(1, 234, new Date(time - 1000).toISOString()), time);
    await recordTravoAlertTransitions(payload(1, 234, latest), time);
    await recordTravoAlertTransitions(payload(1, "N/A", new Date(time + 1000).toISOString()), time + 1000);
    await recordTravoAlertTransitions(payload(1, 234, latest), time + 31_000);
    expect(mocks.logs).toHaveLength(1);
    expect(mocks.states.get("1:panel.phase.r.voltage")?.critical).toBe(true);
  });

  it("retries a MariaDB deadlock and records the transition once", async () => {
    mocks.failures.push(new Prisma.PrismaClientKnownRequestError("deadlock", {
      code: "P2010",
      clientVersion: "test",
      meta: { driverAdapterError: { cause: { kind: "TransactionWriteConflict" } } }
    }));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const time = Date.parse("2026-11-20T06:00:00Z");
      await recordTravoAlertTransitions(payload(1, 224, new Date(time).toISOString()), time);
      expect(mocks.attempts).toBe(2);
      expect(mocks.logs.map(({ action }) => action)).toEqual(["alert.critical"]);
      expect(warning).toHaveBeenCalledOnce();
    } finally {
      warning.mockRestore();
    }
  });

  it("propagates unrelated errors without retrying", async () => {
    const error = new Error("database unavailable");
    mocks.failures.push(error);
    const time = Date.parse("2026-11-20T06:00:00Z");
    await expect(recordTravoAlertTransitions(payload(1, 224, new Date(time).toISOString()), time)).rejects.toBe(error);
    expect(mocks.attempts).toBe(1);
  });

  it("stops retrying after three failed transactions", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("deadlock", { code: "P2034", clientVersion: "test" });
    mocks.failures.push(error, error, error);
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const time = Date.parse("2026-11-20T06:00:00Z");
      await expect(recordTravoAlertTransitions(payload(1, 224, new Date(time).toISOString()), time)).rejects.toBe(error);
      expect(mocks.attempts).toBe(3);
    } finally {
      warning.mockRestore();
    }
  });
});
