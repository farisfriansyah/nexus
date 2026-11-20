import { beforeEach, describe, expect, it, vi } from "vitest";
import { indicators } from "../../src/config/ops-eng/indicators";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  find: vi.fn(),
  upsert: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/lib/db", () => ({ getDb: () => ({ $transaction: mocks.transaction }) }));

import { saveIndicatorThreshold } from "../../src/features/indicator-thresholds/store";

describe("threshold change audit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.query.mockResolvedValue([{ bands: [] }]);
    mocks.find.mockResolvedValue({ bands: indicators[0]!.bands });
    mocks.upsert.mockResolvedValue({ key: indicators[0]!.key, updatedAt: new Date(), updatedBy: "dev@example.com" });
    mocks.audit.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (run) => run({
      $queryRaw: mocks.query,
      indicatorThreshold: { findUniqueOrThrow: mocks.find, upsert: mocks.upsert },
      auditLog: { create: mocks.audit }
    }));
  });

  it("records the actor and old and new values in the update transaction", async () => {
    await saveIndicatorThreshold(indicators[0]!.key, [], "dev@example.com");
    expect(mocks.audit).toHaveBeenCalledWith({ data: {
      action: "threshold.update", actor: "dev@example.com", target: indicators[0]!.key,
      details: { before: indicators[0]!.bands, after: [] }
    } });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("rejects the transaction if the audit write fails", async () => {
    mocks.audit.mockRejectedValue(new Error("audit unavailable"));
    await expect(saveIndicatorThreshold(indicators[0]!.key, [], "dev@example.com")).rejects.toThrow("audit unavailable");
  });
});
