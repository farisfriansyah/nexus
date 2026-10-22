import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/auth/session";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { role: UserRole };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
  }
}
