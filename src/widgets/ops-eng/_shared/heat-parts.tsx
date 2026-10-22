"use client";

import "./heat-parts.css";

import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { aggregateStatus, evaluateStatus } from "@/lib/status/engine";
import { monthLabel, nowMs } from "@/lib/status/time";
import { HeatStrip } from "@/widgets/_primitives/charts";
import { StatusIcon, STATUS_LABEL } from "@/widgets/_primitives/status";
import { WidgetCard, relativeAge } from "@/widgets/_primitives/widget-card";
import type { DashboardMode } from "@/features/widgets-registry/types";
import { useMonthly } from "./hooks";

/** Aset x 12 bulan: sel berwarna status dan berisi jumlah kasus, ditambah kolom YTD. */
export function HeatListWidget({ mode, widgetId, title, keys, subtitle }: { mode: DashboardMode; widgetId: string; title: string; keys: string[]; subtitle?: string }) {
  const { payload, stale } = useMonthly(keys);
  const months = payload?.rows[0]?.series ?? [];
  const year = payload ? payload.period.slice(0, 4) : "";
  const summary = payload?.rows.map((row) => `${row.label} ${row.value === null ? "tidak ada data" : `${formatFixed(row.value, 0)} kasus`}, status ${STATUS_LABEL[row.status]}`).join("; ");
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle={subtitle} status={payload ? aggregateStatus(payload.rows.map((row) => row.status)) : undefined} showBadge={mode === "analytic"} loading={!payload} stale={stale} updatedLabel={payload ? `diinput ${relativeAge(payload.updatedAt, nowMs())}` : undefined} source="Jurnal harian" pic={getIndicator(keys[0]!).pic} summary={summary}>
      <div className="heat">
        <div className="heat-row heat-head" aria-hidden="true">
          <span />
          <span className="heat-months">{months.map((point) => <span key={point.period}>{monthLabel(point.period).slice(0, 1)}</span>)}</span>
          <span className="heat-ytd">YTD</span>
        </div>
        {payload?.rows.map((row) => {
          const def = getIndicator(row.key);
          const ytd = row.series.filter((point) => point.period.startsWith(year)).reduce((sum, point) => sum + (point.value ?? 0), 0);
          return (
            <div className="heat-row" key={row.key} data-status={row.status}>
              <span className="heat-label"><StatusIcon status={row.status} /><span>{row.label}</span></span>
              <HeatStrip cells={row.series.map((point) => ({ label: monthLabel(point.period), status: evaluateStatus(def, point.value), text: point.value === null ? undefined : formatFixed(point.value, 0) }))} />
              <span className="heat-ytd"><b>{formatFixed(ytd, 0)}</b></span>
            </div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
