"use client";

import "./widget.css";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { STATUS_COLOR, StatusIcon } from "@/widgets/_primitives/status";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import { LiveDetail } from "../_shared/detail";
import { useLive } from "../_shared/data";
import { useLiveGroup } from "../_shared/live-parts";
import type { WidgetProps } from "@/features/widgets-registry/types";
import type { Status } from "@/widgets/ops-eng/schemas";

export const keys = ["reactor.sb_ma1.temp", "reactor.sb_ma4.temp", "reactor.wb_ma1.temp", "reactor.wb_ma4.temp"];
const LABELS: Record<string, string> = { "reactor.sb_ma1.temp": "SB MA1", "reactor.sb_ma4.temp": "SB MA4", "reactor.wb_ma1.temp": "WB MA1", "reactor.wb_ma4.temp": "WB MA4" };

function ReactorChart({ keyName }: { keyName: string }) {
  const live = useLive();
  const def = getIndicator(keyName);
  const reading = live.readings[keyName];
  const status: Status = live.statuses[keyName] ?? "no_data";
  const value = reading && status !== "no_data" ? reading.value : null;
  const [lo, hi] = def.domain!;
  const y = (v: number) => 100 - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100;
  const values = reading ? reading.trend.map((point) => point.v) : [];
  let path = "";
  let pen = false;
  values.forEach((v, index) => {
    if (v === null) { pen = false; return; }
    path += `${pen ? "L" : "M"}${((index / Math.max(values.length - 1, 1)) * 100).toFixed(2)} ${y(v).toFixed(2)} `;
    pen = true;
  });
  const lines = [...new Set(def.bands.flatMap((band) => [band.min, band.max]).filter((v): v is number => v !== null && v > lo && v < hi))];
  return (
    <div className="rt-cell" data-status={status} data-key={keyName}>
      <div className="rt-head">
        <span className="rt-label">{LABELS[keyName]} · suhu</span>
        <span className="rt-value" style={{ color: STATUS_COLOR[status] }}>
          <StatusIcon status={status} />
          <b>{value === null ? "–" : formatFixed(value, def.decimals)}</b><small>{def.unit}</small>
        </span>
      </div>
      <div className="rt-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Tren suhu ${LABELS[keyName]}`}>
          {lines.map((line) => <line key={line} x1="0" x2="100" y1={y(line)} y2={y(line)} className="rt-grid" vectorEffect="non-scaling-stroke" />)}
          <path d={path} fill="none" stroke={STATUS_COLOR[status]} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        <span className="rt-axis rt-axis-top">{hi}°</span>
        {lines.map((line) => <span key={line} className="rt-axis" style={{ top: `${y(line)}%` }}>{line}°</span>)}
        <span className="rt-axis rt-axis-bottom">{lo}°</span>
      </div>
    </div>
  );
}

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle="Suhu reaktor" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="rt-grid-2x2">
        {keys.map((key) => <ReactorChart key={key} keyName={key} />)}
      </div>
    </WidgetCard>
  );
}

export function Detail() {
  return <LiveDetail keys={keys} />;
}
