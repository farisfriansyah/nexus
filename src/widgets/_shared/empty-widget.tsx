import { CircleDashed } from "lucide-react";
import type { WidgetDefinition, WidgetProps } from "@/features/widgets-registry/types";

export function EmptyWidget({ title }: WidgetProps) {
  return (
    <div className="empty-widget">
      <div className="empty-widget-title"><CircleDashed size={17} /><h3>{title}</h3></div>
      <div className="empty-widget-message"><span className="empty-dash" /><span>Widget belum diisi</span><span className="empty-dash" /></div>
    </div>
  );
}

export function placeholders(tab: string, items: [id: string, title: string][]): WidgetDefinition[] {
  return items.map(([id, title]) => ({ id, title, tab, modes: ["tv", "analytic"], defaultSize: { minWidth: 180, minHeight: 110 }, component: EmptyWidget }));
}
