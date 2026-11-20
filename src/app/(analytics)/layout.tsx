import { requireSession } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { Topbar } from "@/components/shell/topbar";
import { CriticalAlerts } from "@/components/alerts/critical-alerts";
import { IndicatorThresholdProvider } from "@/features/indicator-thresholds/provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { hasManagementAccess } from "@/lib/auth/roles";

export default async function AnalyticsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const canManage = hasManagementAccess(session.user.role);
  return (
    <PreferencesProvider email={session.user.email!} canManage={canManage}>
      <IndicatorThresholdProvider>
        <QueryProvider>
          <div className="dashboard-shell analytics-shell">
            <Topbar mode="analytic" name={session.user.name} email={session.user.email!} />
            {children}
            <CriticalAlerts />
          </div>
        </QueryProvider>
      </IndicatorThresholdProvider>
    </PreferencesProvider>
  );
}
