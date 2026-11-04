import { notFound } from "next/navigation";
import { LayoutEditor } from "@/components/layout-editor/layout-editor";
import { getTab } from "@/config/tabs";
import { getEditableLayout, getLayoutFromProfile, getTvLayoutProfile } from "@/features/layout/store";

export default async function LayoutEditorPage({ params, searchParams }: { params: Promise<{ tab: string }>; searchParams: Promise<{ profileId?: string }> }) {
  const [{ tab }, query] = await Promise.all([params, searchParams]);
  const info = getTab(tab);
  if (!info) notFound();
  const profileId = query.profileId && /^\d+$/.test(query.profileId) ? Number(query.profileId) : null;
  if (profileId && Number.isSafeInteger(profileId)) {
    const profile = await getTvLayoutProfile(profileId).catch(() => null);
    const layout = profile && getLayoutFromProfile(profile, tab);
    if (!profile || !layout) notFound();
    return <LayoutEditor tab={tab} tabLabel={info.label} initial={{ layout, source: "published", version: null }} profileId={profileId} profileName={profile.name} />;
  }
  const loaded = await getEditableLayout(tab).catch(() => null);
  if (!loaded) notFound();
  return <LayoutEditor tab={tab} tabLabel={info.label} initial={loaded} />;
}