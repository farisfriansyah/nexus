import { notFound } from "next/navigation";
import { LayoutEditor } from "@/components/layout-editor/layout-editor";
import { getTab } from "@/config/tabs";
import { getEditableLayout } from "@/features/layout/store";

export default async function LayoutEditorPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const info = getTab(tab);
  if (!info) notFound();
  const loaded = await getEditableLayout(tab).catch(() => null);
  if (!loaded) notFound();
  return <LayoutEditor tab={tab} tabLabel={info.label} initial={loaded} />;
}