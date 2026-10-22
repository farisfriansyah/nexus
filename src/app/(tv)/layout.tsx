import { requireSession } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { Topbar } from "@/components/shell/topbar";
import { CriticalAlerts } from "@/components/alerts/critical-alerts";

export default async function TvLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <PreferencesProvider email={session.user.email!}>
      <div className="dashboard-shell tv-shell">
        <Topbar mode="tv" name={session.user.name} email={session.user.email!} isAdmin={session.user.role === "admin"} />
        {children}
        <CriticalAlerts />
      </div>
    </PreferencesProvider>
  );
}
