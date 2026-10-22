export const DEV_LOGIN_COOKIE = "nexus-dev-login";

// Temporary login bypass, only active when AUTH_DEV_LOGIN=1. Remove once Google OAuth is configured.
export function isDevLoginEnabled(): boolean {
  return process.env.AUTH_DEV_LOGIN === "1";
}

export const devSession = {
  user: { name: "Dev User", email: "dev@mikatasa.com", role: "admin" as const },
  expires: "2099-01-01T00:00:00.000Z"
};
