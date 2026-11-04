"use client";

import "./widget.css";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { STATUS_COLOR, STATUS_LABEL } from "@/widgets/_primitives/status";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import { LiveDetail } from "../_shared/detail";
import { useLiveGroup } from "../_shared/live-parts";
import type { WidgetProps } from "@/features/widgets-registry/types";
import type { Status } from "@/widgets/ops-eng/schemas";

export const keys = ["boiler.ma4.pressure"];
const DOMAIN: [number, number] = [2, 5.5];
const CX = 100, CY = 100, R_OUT = 86, R_IN = 58;

const point = (fraction: number, radius: number) => {
  const angle = Math.PI - fraction * Math.PI;
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)] as const;
};

function arc(from: number, to: number) {
  const [x1, y1] = point(from, R_OUT);
  const [x2, y2] = point(to, R_OUT);
  const [x3, y3] = point(to, R_IN);
  const [x4, y4] = point(from, R_IN);
  const large = to - from > 0.5 ? 1 : 0;
  return `M${x1} ${y1}A${R_OUT} ${R_OUT} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${R_IN} ${R_IN} 0 ${large} 0 ${x4} ${y4}Z`;
}

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  const def = getIndicator(keys[0]!);
  const reading = group.live.readings[keys[0]!];
  const status: Status = group.live.statuses[keys[0]!] ?? "no_data";
  const value = reading && status !== "no_data" ? reading.value : null;
  const [lo, hi] = DOMAIN;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  const segments = [...def.bands].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity)).map((band) => ({ band, from: frac(band.min ?? lo), to: frac(band.max ?? hi) }));
  const edges = [...new Set(def.bands.flatMap((band) => [band.min, band.max]).filter((v): v is number => v !== null && v > lo && v < hi))].sort((a, b) => a - b).filter((edge, index, all) => index === 0 || frac(edge) - frac(all[index - 1]!) > 0.06);
  const needle = value === null ? null : point(frac(value), R_OUT - 4);

  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} subtitle="Kompressor MA4" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="pg" data-status={status} style={{ padding: "160px" }}>
        <svg className="pg-svg" viewBox="0 0 200 150" role="img" aria-label={`Tekanan ${value === null ? "tidak ada data" : formatFixed(value, def.decimals)} ${def.unit}, ${STATUS_LABEL[status]}`}>
          {segments.map(({ band, from, to }, index) => (
            <path key={index} d={arc(from, to)} fill={STATUS_COLOR[band.status]} stroke="var(--app-surface)" strokeWidth="1" />
          ))}
          {edges.map((edge) => {
            const [x, y] = point(frac(edge), R_OUT + 9);
            return <text key={edge} x={x} y={y} className="pg-tick" textAnchor="middle" dominantBaseline="middle">{edge}</text>;
          })}
          {needle && (
            <g>
              <line x1={CX} y1={CY} x2={needle[0]} y2={needle[1]} className="pg-needle" />
              <circle cx={CX} cy={CY} r="5" className="pg-hub" />
            </g>
          )}
          <text x="100" y="130" className="pg-num" textAnchor="middle">{value === null ? "–" : formatFixed(value, def.decimals)}<tspan className="pg-unit" dx="4">{def.unit}</tspan></text>
          <text x="100" y="144" className="pg-state" textAnchor="middle" fill={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</text>
        </svg>
      </div>
    </WidgetCard>
  );
}

export function Detail() {
  return <LiveDetail keys={keys} />;
}
