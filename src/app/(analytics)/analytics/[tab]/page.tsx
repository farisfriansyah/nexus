import { notFound } from "next/navigation";
import { getTab } from "@/config/tabs";
import { analyticLayouts } from "@/config/layouts/seed";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default async function AnalyticsPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!getTab(tab)) notFound();
  const layout = analyticLayouts[tab];
  if (!layout) notFound();
  return <AnalyticsDashboard layout={layout} tab={tab} />;
}
