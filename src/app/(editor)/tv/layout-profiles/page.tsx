import { TvLayoutProfiles } from "@/components/layout-editor/tv-layout-profiles";
import { listTvLayoutProfiles, type TvLayoutProfileSummary } from "@/features/layout/store";

export default async function TvLayoutProfilesPage() {
  let profiles: TvLayoutProfileSummary[] = [];
  let loadError = false;
  try {
    profiles = await listTvLayoutProfiles();
  } catch (error) {
    console.error("[tv-layout-profiles] Gagal memuat daftar preset", error);
    loadError = true;
  }
  return <TvLayoutProfiles initialProfiles={profiles} loadError={loadError} />;
}
