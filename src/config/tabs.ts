import type { LucideIcon } from "lucide-react";
import { Factory, PackageCheck, Settings2, SquareDashed } from "lucide-react";

export interface DashboardTab {
  id: string;
  slug: string;
  label: string;
  icon: LucideIcon;
  order: number;
}

export const tabs: DashboardTab[] = [
  { id: "plant-kpi", slug: "plant-kpi", label: "Plant KPI", icon: Factory, order: 1 },
  { id: "produksi-packing", slug: "produksi-packing", label: "Produksi & Packing", icon: PackageCheck, order: 2 },
  { id: "ops-eng", slug: "ops-eng", label: "Ops. Eng", icon: Settings2, order: 3 },
  { id: "reserved", slug: "reserved", label: "Reserved", icon: SquareDashed, order: 4 }
].sort((a, b) => a.order - b.order);

export const firstTabSlug = tabs[0]?.slug ?? "plant-kpi";

export function getTab(slug: string): DashboardTab | undefined {
  return tabs.find((tab) => tab.slug === slug);
}
