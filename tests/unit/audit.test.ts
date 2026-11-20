import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loginDelete: vi.fn(),
  auditDelete: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    loginLog: { deleteMany: mocks.loginDelete },
    auditLog: { deleteMany: mocks.auditDelete },
    $transaction: mocks.transaction
  })
}));

import { cleanupOldLogs } from "../../src/lib/audit";

afterEach(() => vi.useRealTimers());

describe("audit retention", () => {
  it("deletes only logs older than one year and limits cleanup to once a day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    mocks.transaction.mockResolvedValue([]);
    await cleanupOldLogs();
    await cleanupOldLogs();
    const filter = { where: { createdAt: { lt: new Date("2025-11-20T12:00:00Z") } } };
    expect(mocks.loginDelete).toHaveBeenCalledOnce();
    expect(mocks.loginDelete).toHaveBeenCalledWith(filter);
    expect(mocks.auditDelete).toHaveBeenCalledWith(filter);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    await cleanupOldLogs();
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
