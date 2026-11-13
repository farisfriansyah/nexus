export const DEV_LOGIN_COOKIE = "nexus-dev-login";

export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";
}

export const devSession = {
  user: { name: "Dev User", email: "dev@mikatasa.com", role: "admin" as const },
  expires: "2099-01-01T00:00:00.000Z"
};
