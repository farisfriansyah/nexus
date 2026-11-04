import { notFound } from "next/navigation";
import { getTab } from "@/config/tabs";
import { getLayoutFromProfile, getPublishedLayout, getTvLayoutProfile } from "@/features/layout/store";
import { TvDashboard } from "@/components/tv/tv-dashboard";
import { env } from "@/lib/env";

export default async function TvPage({ params, searchParams }: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ debug?: string; profileId?: string }>;
}) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);
  if (!getTab(tab)) notFound();
  const parsedProfileId = query.profileId && /^\d+$/.test(query.profileId) ? Number(query.profileId) : null;
  const profile = parsedProfileId && Number.isSafeInteger(parsedProfileId) ? await getTvLayoutProfile(parsedProfileId).catch(() => null) : null;
  const profileLayout = profile && getLayoutFromProfile(profile, tab);
  const layout = profileLayout ?? (await getPublishedLayout(tab))?.layout;
  if (!layout) notFound();
  return <TvDashboard layout={layout} tab={tab} profileId={profile ? String(profile.id) : null} debug={query.debug === "1"} heartbeatReloadMinutes={env.HEARTBEAT_RELOAD_MINUTES} />;
}
