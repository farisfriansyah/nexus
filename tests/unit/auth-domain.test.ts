import { describe, expect, it } from "vitest";
import { isAllowedGoogleProfile } from "../../src/lib/auth/domain";

describe("isAllowedGoogleProfile", () => {
  const domain = "mikatasa.com";
  it("accepts a verified address on the allowed domain case-insensitively", () => {
    expect(isAllowedGoogleProfile({ email: "USER@MIKATASA.COM", emailVerified: true, allowedDomain: domain })).toBe(true);
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
