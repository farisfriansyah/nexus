"use client";

import "./monthly-parts.css";
import { nowMs } from "@/lib/status/time";

import { getIndicator } from "@/config/ops-eng/indicators";
import { computeDelta } from "@/lib/status/delta";
import { formatFixed, formatSigned } from "@/lib/format";
import { evaluateStatus } from "@/lib/status/engine";
import { monthLabel } from "@/lib/status/time";
import { BulletBar, Delta, MiniBars, ProgressTarget } from "@/widgets/_primitives/charts";
import { StatusIcon, STATUS_LABEL } from "@/widgets/_primitives/status";
import { WidgetCard, relativeAge } from "@/widgets/_primitives/widget-card";
import type { DashboardMode } from "@/features/widgets-registry/types";
import type { MonthlyRow, Status } from "@/widgets/ops-eng/schemas";
import { useMonthly } from "./hooks";
import { aggregateStatus } from "@/lib/status/engine";

export function RowDelta({ row }: { row: MonthlyRow }) {
  const def = getIndicator(row.key);
  const previous = row.series[row.series.length - 2]?.value;
  const delta = computeDelta(row.value, previous, def.direction, row.unit);
  if (!delta) return <span className="delta delta-neutral">–</span>;
  return <Delta arrow={delta.arrow} tone={delta.tone} text={`${formatSigned(delta.diff, def.decimals)} ${delta.unit}`} />;
}

export function RowBars({ row }: { row: MonthlyRow }) {
  const def = getIndicator(row.key);
  return (
    <MiniBars
      points={row.series.map((point) => ({ label: monthLabel(point.period), value: point.value }))}
      statusOf={(value) => evaluateStatus(def, value)}
      target={def.targetValue ?? null}
    />
  );
}

export function valueText(row: MonthlyRow) {
  return formatFixed(row.value, getIndicator(row.key).decimals);
}

function rowSummary(row: MonthlyRow) {
  const def = getIndicator(row.key);
  const target = def.targetText ?? (def.targetValue !== undefined ? `${formatFixed(def.targetValue, def.decimals)} ${def.unit}` : null);
  return `${row.label} ${row.value === null ? "tidak ada data" : `${valueText(row)} ${row.unit}`}${target ? `, target ${target}` : ""}, status ${STATUS_LABEL[row.status]}`;
}

const journalLabel = (updatedAt: string) => `diinput ${relativeAge(updatedAt, nowMs())}`;

interface BaseProps { mode: DashboardMode; widgetId: string; title: string; keys: string[] }

/** Beberapa entitas bulanan dalam satu widget: grid kartu, tiap kartu = angka, delta, dan grafik batang + tren 12 bulan. */
export function MonthlyListWidget({ mode, widgetId, title, keys, subtitle, showYtd = false }: BaseProps & { subtitle?: string; showYtd?: boolean }) {
  const { payload, stale } = useMonthly(keys);
  const worst: Status = payload ? aggregateStatus(payload.rows.map((row) => row.status)) : "no_data";
  const count = payload?.rows.length ?? keys.length;
  const cols = count === 3 ? 3 : 2;
  const year = payload ? payload.period.slice(0, 4) : "";
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} subtitle={subtitle} status={payload ? worst : undefined} showBadge={mode === "analytic"} loading={!payload} stale={stale} updatedLabel={payload ? journalLabel(payload.updatedAt) : undefined} source="Jurnal harian" pic={getIndicator(keys[0]!).pic} summary={payload?.rows.map(rowSummary).join("; ")}>
      <ul className="mgrid" style={{ "--cols": cols } as React.CSSProperties} data-count={count}>
        {payload?.rows.map((row) => {
          const def = getIndicator(row.key);
          const ytd = row.series.filter((point) => point.period.startsWith(year)).reduce((sum, point) => sum + (point.value ?? 0), 0);
          return (
            <li key={row.key} className="mcard" data-status={row.status} data-key={row.key}>
              <div className="mcard-head">
                <span className="mcard-label"><StatusIcon status={row.status} /><span>{row.label}</span></span>
                {showYtd && <span className="mcard-ytd">YTD <b>{formatFixed(ytd, 0)}</b></span>}
              </div>
              <div className="mcard-value">
                <b>{valueText(row)}</b><small>{row.unit}</small>
                <RowDelta row={row} />
              </div>
              {def.targetText && <div className="mcard-target">Target {def.targetText}</div>}
              <div className="mcard-chart"><RowBars row={row} /></div>
              <div className="mcard-months" aria-hidden="true">{row.series.map((point) => <span key={point.period}>{monthLabel(point.period).slice(0, 1)}</span>)}</div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/** Satu indikator bulanan: angka besar, bullet/progres, delta, 12 bulan. */
export function MonthlySingleWidget({ mode, widgetId, title, keys, bulletMax, children }: BaseProps & { bulletMax?: number; children?: (row: MonthlyRow) => React.ReactNode }) {
  const { payload, stale } = useMonthly(keys);
  const row = payload?.rows[0];
  const def = getIndicator(keys[0]!);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} status={row?.status} showBadge={mode === "analytic"} loading={!payload} stale={stale} updatedLabel={payload ? journalLabel(payload.updatedAt) : undefined} source="Jurnal harian" pic={def.pic} summary={row ? rowSummary(row) : undefined}>
      {row && (
        <div className="single" data-status={row.status}>
          <div className="single-main">
            <span className="single-icon"><StatusIcon status={row.status} /></span>
            <span className="bignum bignum-xl"><span className="bignum-value">{valueText(row)}</span><span className="bignum-unit">{row.unit}</span></span>
            <RowDelta row={row} />
          </div>
          {def.targetText && <div className="single-target">Target: {def.targetText}</div>}
          {children ? children(row) : bulletMax && def.targetValue !== undefined ? <BulletBar value={row.value} target={def.targetValue} max={bulletMax} status={row.status} /> : null}
          <RowBars row={row} />
        </div>
      )}
    </WidgetCard>
  );
}

export { ProgressTarget };
