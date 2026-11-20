import { getDb } from "@/lib/db";
import type { UserRole } from "@/lib/auth/roles";

type LoginLogEntry = {
  email: string;
  name?: string | null;
  role: UserRole;
  provider: string;
  userAgent: string | null;
};

export async function recordLogin(entry: LoginLogEntry): Promise<void> {
  await getDb().loginLog.create({
    data: {
      email: entry.email,
      name: entry.name?.slice(0, 191) || null,
      role: entry.role,
      provider: entry.provider,
      userAgent: entry.userAgent?.slice(0, 512) || null
    }
  });
}
