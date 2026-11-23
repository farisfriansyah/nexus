import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  active: vi.fn(),
  updateMany: vi.fn(),
  audit: vi.fn(),
  session: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    auditLog: { findMany: mocks.findMany, count: mocks.count },
    travoAlertState: { findMany: mocks.active },
    $transaction: (run: (tx: object) => Promise<unknown>) => run({
      auditLog: { updateMany: mocks.updateMany, create: mocks.audit }
    })
  })
}));
vi.mock("@/lib/auth/session", () => ({ requireSession: mocks.session }));

import { listNotifications, updateNotifications } from "../../src/features/notifications/store";
import { GET, PATCH } from "../../src/app/api/notifications/route";

describe("notifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.session.mockResolvedValue({ user: { email: "viewer@example.com", role: "viewer" } });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.active.mockResolvedValue([]);
    mocks.updateMany.mockResolvedValue({ count: 2 });
    mocks.audit.mockResolvedValue({});
  });

  it("lists critical events with pagination and only fresh critical states", async () => {
    const now = new Date("2026-11-23T02:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      mocks.findMany.mockResolvedValue(Array.from({ length: 31 }, (_, index) => ({
        id: 100 - index, action: "alert.critical", target: null, isRead: false, isResolved: false,
        createdAt: now, details: { key: "panel.phase.r.voltage", unit: 1, value: 224, unitLabel: "V", observedAt: now.toISOString() }
      })));
      mocks.active.mockResolvedValue([{ unit: 1, key: "panel.phase.r.voltage", observedAt: now }]);
      const result = await listNotifications(101);
      expect(result.items).toHaveLength(30);
      expect(result.nextCursor).toBe(71);
      expect(result.items[0]).toMatchObject({ label: "L1 Tegangan Fasa-N", unit: 1, value: 224 });
      expect(result.active).toHaveLength(1);
      expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { action: "alert.critical", id: { lt: 101 } } }));
      expect(mocks.active).toHaveBeenCalledWith(expect.objectContaining({
        where: { critical: true, observedAt: { gte: new Date(now.getTime() - 30_000) } }
      }));
    } finally { vi.useRealTimers(); }
  });

  it("updates only critical events and audits a shared bulk change", async () => {
    await updateNotifications({ selection: [7, 9], field: "isResolved", value: true }, "viewer@example.com");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { action: "alert.critical", id: { in: [7, 9] }, isResolved: false },
      data: { isResolved: true }
    });
    expect(mocks.audit).toHaveBeenCalledWith({ data: {
      action: "notification.update", actor: "viewer@example.com",
      details: { selection: [7, 9], field: "isResolved", value: true, count: 2 }
    } });
  });

  it("allows all logged-in users to mark all unread and rejects invalid mutations", async () => {
    const request = (body: object) => new Request("http://localhost/api/notifications", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    expect((await PATCH(request({ selection: "all", field: "isRead", value: false }))).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { action: "alert.critical", isRead: true }, data: { isRead: false }
    });
    expect((await PATCH(request({ selection: [], field: "isRead", value: true }))).status).toBe(422);
    expect((await PATCH(request({ selection: "all", field: "action", value: true }))).status).toBe(422);
    expect(mocks.updateMany).toHaveBeenCalledOnce();
  });

  it("rejects invalid pagination and reports database errors", async () => {
    expect((await GET(new Request("http://localhost/api/notifications?before=-1"))).status).toBe(422);
    mocks.updateMany.mockRejectedValue(new Error("database unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await PATCH(new Request("http://localhost/api/notifications", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ selection: "all", field: "isRead", value: true })
      }));
      expect(response.status).toBe(503);
      expect(log).toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
