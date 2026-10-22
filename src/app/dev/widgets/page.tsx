import { notFound } from "next/navigation";
import { WidgetGallery } from "@/components/dev/widget-gallery";

// Galeri QA widget: hanya tersedia di non-production.
export default function DevWidgetsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <WidgetGallery />;
}
