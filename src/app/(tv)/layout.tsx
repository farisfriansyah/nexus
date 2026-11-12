import { requireSession } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { Topbar } from "@/components/shell/topbar";
import { CriticalAlerts } from "@/components/alerts/critical-alerts";
import { listTvLayoutProfiles, type TvLayoutProfileSummary } from "@/features/layout/store";
import { IndicatorThresholdProvider } from "@/features/indicator-thresholds/provider";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function TvLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  let profiles: TvLayoutProfileSummary[] | null = [];
  try {
    profiles = await listTvLayoutProfiles();
  } catch (error) {
    console.error("[tv] Gagal memuat preset layout", error);
    profiles = null;
  }
  return (
    <PreferencesProvider email={session.user.email!} isAdmin={session.user.role === "admin"}>
      <IndicatorThresholdProvider>
        <QueryProvider>
          <div className="dashboard-shell tv-shell">
            <Topbar mode="tv" name={session.user.name} email={session.user.email!} isAdmin={session.user.role === "admin"} profiles={profiles} />
            {children}
            <CriticalAlerts />
          </div>
        </QueryProvider>
      </IndicatorThresholdProvider>
    </PreferencesProvider>
  );
}
