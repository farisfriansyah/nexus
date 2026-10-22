"use client";

import "./widget.css";
import { formatFixed } from "@/lib/format";
import { aggregateStatus } from "@/lib/status/engine";
import { nowMs } from "@/lib/status/time";
import { EventTimeline } from "@/widgets/_primitives/charts";
import { StatusIcon } from "@/widgets/_primitives/status";
import { WidgetCard, relativeAge } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";
import { useMtbf } from "./data";

const DAY = 86_400_000;

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const { payload } = useMtbf();
  const now = nowMs();
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle="Kegagalan pada jendela pengamatan" status={payload ? aggregateStatus(payload.rows.map((row) => row.status)) : undefined} showBadge={mode === "analytic"} loading={!payload} updatedLabel={payload ? `diinput ${relativeAge(payload.updatedAt, now)}` : undefined} source="Jurnal harian" pic="Erwina" summary={payload?.rows.map((row) => `${row.label} ${row.count} kasus pada jendela ${row.windowDays} hari`).join("; ")}>
      <ul className="mtbf">
        {payload?.rows.map((row) => (
          <li key={row.key} className="mtbf-row" data-status={row.status}>
            <span className="mtbf-label"><StatusIcon status={row.status} /><span>{row.label}</span></span>
            <span className="mtbf-value"><b>{row.status === "no_data" ? "–" : row.count}</b><small>kasus / {row.windowDays} hr</small></span>
            <span className="mtbf-line"><EventTimeline events={row.failures.map((date) => new Date(date).getTime())} windowStart={now - row.windowDays * DAY} windowEnd={now} status={row.status} /></span>
            <span className="mtbf-meta">
              MTBF {row.mtbfDays === null ? "–" : `${formatFixed(row.mtbfDays, 0)} hr`} · terakhir {row.daysSinceLast === null ? "–" : `${row.daysSinceLast} hr lalu`}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
