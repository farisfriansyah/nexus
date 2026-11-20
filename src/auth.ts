import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { adminEmails, env } from "@/lib/env";
import { isAllowedGoogleProfile } from "@/lib/auth/domain";
import { getDb } from "@/lib/db";
import { parseUserRole } from "@/lib/auth/roles";
import { recordLogin } from "@/lib/auth/login-log";
import { headers } from "next/headers";
import { recordSecurityAudit } from "@/lib/audit";

async function roleFromDatabase(email: string) {
  const rows = await getDb().$queryRaw<{ role: string | null }[]>`
    SELECT role
    FROM users
    WHERE LOWER(email) = LOWER(${email})
    ORDER BY id DESC
    LIMIT 1
  `;
  const user = rows[0];
  if (!user) return null;
  return parseUserRole(user.role) ?? "viewer";
}

async function roleForEmail(email: string) {
  return await roleFromDatabase(email) ?? (adminEmails.has(email.toLowerCase()) ? "admin" : "viewer");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: { params: { hd: env.ALLOWED_EMAIL_DOMAIN } }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: env.SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60 * 24
  },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      const claims = profile as { email?: string; email_verified?: boolean; hd?: string } | undefined;
      const allowed = isAllowedGoogleProfile({
        email: claims?.email ?? user.email,
        emailVerified: claims?.email_verified === true,
        hostedDomain: claims?.hd,
        allowedDomain: env.ALLOWED_EMAIL_DOMAIN
      });
      if (!allowed) {
        await recordSecurityAudit({ action: "auth.denied", target: "google", details: { reason: "domain_or_verification" } });
      }
      return allowed ? true : "/login?error=domain";
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        token.role = await roleForEmail(email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = parseUserRole(token.role) ?? "viewer";
      return session;
    }
  },
  events: {
    async signIn({ user, account }) {
      try {
        if (!user.email) throw new Error("Email login tidak tersedia");
        const email = user.email.toLowerCase();
        await recordLogin({
          email,
          name: user.name,
          role: await roleForEmail(email),
          provider: account?.provider ?? "unknown",
          userAgent: (await headers()).get("user-agent")
        });
      } catch (error) {
        console.error("[login-log] Gagal mencatat login", error);
      }
    }
  }
});
