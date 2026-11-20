import { requireManagementAccess } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { hasManagementAccess } from "@/lib/auth/roles";

export default async function EditorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireManagementAccess("layout.editor");
  return (
    <PreferencesProvider email={session.user.email!} canManage={hasManagementAccess(session.user.role)}>
      <div className="dashboard-shell">{children}</div>
    </PreferencesProvider>
  );
}