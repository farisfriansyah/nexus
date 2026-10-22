import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { adminEmails, env } from "@/lib/env";
import { isAllowedGoogleProfile } from "@/lib/auth/domain";

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
      return allowed ? true : "/login?error=domain";
    },
    async jwt({ token, user }) {
      if (user?.email) token.role = adminEmails.has(user.email.toLowerCase()) ? "admin" : "viewer";
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role === "admin" ? "admin" : "viewer";
      return session;
    }
  }
});
