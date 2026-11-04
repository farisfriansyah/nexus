import { requireSession } from "@/lib/auth/session";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { Topbar } from "@/components/shell/topbar";
import { CriticalAlerts } from "@/components/alerts/critical-alerts";
import { IndicatorThresholdProvider } from "@/features/indicator-thresholds/provider";

export default async function AnalyticsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  return (
    <PreferencesProvider email={session.user.email!} isAdmin={session.user.role === "admin"}>
      <IndicatorThresholdProvider>
        <div className="dashboard-shell analytics-shell">
          <Topbar mode="analytic" name={session.user.name} email={session.user.email!} />
          {children}
          <CriticalAlerts />
        </div>
      </IndicatorThresholdProvider>
    </PreferencesProvider>
  );
}
