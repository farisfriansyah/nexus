import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedGoogleProfile } from "../../src/lib/auth/domain";
import { isDevLoginEnabled } from "../../src/lib/auth/dev-login";

describe("isAllowedGoogleProfile", () => {
  const domain = "mikatasa.com";
  it("accepts a verified address on the allowed domain case-insensitively", () => {
    expect(isAllowedGoogleProfile({ email: "USER@MIKATASA.COM", emailVerified: true, allowedDomain: domain })).toBe(true);
  });

  describe("development login bypass", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("requires explicit opt-in outside production", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("AUTH_DEV_LOGIN", "1");
      expect(isDevLoginEnabled()).toBe(true);
      vi.stubEnv("AUTH_DEV_LOGIN", "");
      expect(isDevLoginEnabled()).toBe(false);
    });

    it("is disabled in production even when opted in", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_DEV_LOGIN", "1");
      expect(isDevLoginEnabled()).toBe(false);
    });
  });
  it("rejects an unverified address", () => {
    expect(isAllowedGoogleProfile({ email: "user@mikatasa.com", emailVerified: false, allowedDomain: domain })).toBe(false);
  });
  it("rejects domain suffix attacks", () => {
    expect(isAllowedGoogleProfile({ email: "user@mikatasa.com.evil.com", emailVerified: true, allowedDomain: domain })).toBe(false);
  });
  it("checks hosted domain when Google provides it", () => {
    expect(isAllowedGoogleProfile({ email: "user@mikatasa.com", emailVerified: true, hostedDomain: "evil.com", allowedDomain: domain })).toBe(false);
  });
});
