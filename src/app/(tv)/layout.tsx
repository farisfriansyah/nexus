import { requireSession } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { Topbar } from "@/components/shell/topbar";
import { CriticalAlerts } from "@/components/alerts/critical-alerts";
import { listTvLayoutProfiles, type TvLayoutProfileSummary } from "@/features/layout/store";
import { IndicatorThresholdProvider } from "@/features/indicator-thresholds/provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { hasManagementAccess } from "@/lib/auth/roles";

export default async function TvLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const canManage = hasManagementAccess(session.user.role);
  let profiles: TvLayoutProfileSummary[] | null = [];
  try {
    profiles = await listTvLayoutProfiles();
  } catch (error) {
    console.error("[tv] Gagal memuat preset layout", error);
    profiles = null;
  }
  return (
    <PreferencesProvider email={session.user.email!} canManage={canManage}>
      <IndicatorThresholdProvider>
        <QueryProvider>
          <div className="dashboard-shell tv-shell">
            <Topbar mode="tv" name={session.user.name} email={session.user.email!} canManage={canManage} profiles={profiles} />
            {children}
            <CriticalAlerts />
          </div>
        </QueryProvider>
      </IndicatorThresholdProvider>
    </PreferencesProvider>
  );
}
