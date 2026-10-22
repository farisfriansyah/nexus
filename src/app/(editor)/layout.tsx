import { requireAdmin } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";

export default async function EditorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin();
  return (
    <PreferencesProvider email={session.user.email!}>
      <div className="dashboard-shell">{children}</div>
    </PreferencesProvider>
  );
}