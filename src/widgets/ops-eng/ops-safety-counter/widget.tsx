"use client";

import "./widget.css";
import { nowMs } from "@/lib/status/time";
import { StatusIcon } from "@/widgets/_primitives/status";
import { WidgetCard, relativeAge } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";
import { useSafety } from "./data";

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const { payload } = useSafety();
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle="Zero accident" status={payload?.status} showBadge={mode === "analytic"} loading={!payload} updatedLabel={payload ? `diinput ${relativeAge(payload.updatedAt, nowMs())}` : undefined} source="Jurnal harian" pic="Usman" summary={payload ? `${payload.daysSince ?? "tidak diketahui"} hari tanpa kecelakaan, kasus bulan ini ${payload.casesThisMonth ?? "tidak ada data"}, target 0` : undefined}>
      {payload && (
        <div className="safety" data-status={payload.status}>
          <span className="safety-icon"><StatusIcon status={payload.status} /></span>
          <div className="safety-main">
            <b className="safety-days">{payload.daysSince ?? "–"}</b>
            <span>hari tanpa kecelakaan</span>
          </div>
          <div className="safety-meta">
            <span>Kasus bulan ini: <b>{payload.casesThisMonth ?? "–"}</b></span>
            <span>Terakhir: {payload.lastIncidentDate ? new Date(payload.lastIncidentDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "–"}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
