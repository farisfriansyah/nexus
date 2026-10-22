import { notFound } from "next/navigation";
import { getTab } from "@/config/tabs";
import { getPublishedLayout } from "@/features/layout/store";
import { TvDashboard } from "@/components/tv/tv-dashboard";
import { env } from "@/lib/env";

export default async function TvPage({ params, searchParams }: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ debug?: string }>;
}) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);
  if (!getTab(tab)) notFound();
  const layout = (await getPublishedLayout(tab))?.layout;
  if (!layout) notFound();
  return <TvDashboard layout={layout} tab={tab} debug={query.debug === "1"} heartbeatReloadMinutes={env.HEARTBEAT_RELOAD_MINUTES} />;
}
