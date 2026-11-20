import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";

const mocks = vi.hoisted(() => ({
  config: null as import("next-auth").NextAuthConfig | null,
  query: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
  setCookie: vi.fn(),
  headers: vi.fn(),
  devEnabled: vi.fn()
}));

vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    mocks.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  }
}));
vi.mock("next-auth/providers/google", () => ({ default: () => ({}) }));
vi.mock("@/lib/env", () => ({
  adminEmails: new Set<string>(),
  env: { ALLOWED_EMAIL_DOMAIN: "mikatasa.com", SESSION_MAX_AGE_SECONDS: 3600 }
}));
vi.mock("@/lib/db", () => ({
  getDb: () => ({ $queryRaw: mocks.query, loginLog: { create: mocks.create }, auditLog: { create: mocks.audit } })
}));
vi.mock("next/headers", () => ({
  headers: mocks.headers,
  cookies: async () => ({ set: mocks.setCookie })
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); }
}));
vi.mock("@/lib/auth/dev-login", () => ({
  DEV_LOGIN_COOKIE: "nexus-dev-login",
  isDevLoginEnabled: mocks.devEnabled,
  devSession: { user: { name: "Dev User", email: "dev@mikatasa.com", role: "dev" } }
}));

import "../../src/auth";
import { devLoginAction } from "../../src/app/actions";

describe("login audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue([{ role: "dev" }]);
    mocks.create.mockResolvedValue({});
    mocks.audit.mockResolvedValue({});
    mocks.headers.mockResolvedValue(new Headers({ "user-agent": "Test Browser" }));
    mocks.devEnabled.mockReturnValue(true);
  });

  it("records denied Google sign-in without unverified identity information", async () => {
    const result = await mocks.config!.callbacks!.signIn!({
      user: { email: "someone@example.com" },
      account: null,
      profile: { email: "someone@example.com", email_verified: false }
    });
    expect(result).toBe("/login?error=domain");
    expect(mocks.audit).toHaveBeenCalledWith({ data: {
      action: "auth.denied", target: "google", details: { reason: "domain_or_verification" }
    } });
  });

  it("records a successful Google sign-in with its database role", async () => {
    await mocks.config!.events!.signIn!({
      user: { email: "USER@MIKATASA.COM", name: "Test User" },
      account: { provider: "google", type: "oauth", providerAccountId: "test" }
    });

    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith({ data: {
      email: "user@mikatasa.com", name: "Test User", role: "dev",
      provider: "google", userAgent: "Test Browser"
    } });
  });

  it("records development logins but not disabled attempts", async () => {
    await expect(devLoginAction()).rejects.toThrow("redirect:/");
    expect(mocks.create).toHaveBeenCalledWith({ data: {
      email: "dev@mikatasa.com", name: "Dev User", role: "dev",
      provider: "dev", userAgent: "Test Browser"
    } });

    mocks.create.mockClear();
    mocks.devEnabled.mockReturnValue(false);
    await expect(devLoginAction()).rejects.toThrow("redirect:/login?error=disabled");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("reports storage failure without blocking sign-in", async () => {
    mocks.create.mockRejectedValue(new Error("database unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(mocks.config!.events!.signIn!({ user: { email: "user@mikatasa.com" } })).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith("[login-log] Gagal mencatat login", expect.any(Error));
    } finally {
      error.mockRestore();
    }
  });
});
