import "./trend-chart.css";
import type { BandDef } from "@/widgets/ops-eng/schemas";
import { STATUS_COLOR } from "./status";

export interface TrendPoint { label: string; value: number | null }

/** Grafik SVG untuk drawer: zona band sebagai latar, garis/batang data, sumbu sederhana. */
export function TrendChart({ points, bands, domain, kind = "line", unit = "", format = (v: number) => String(v), targetValue }: {
  points: TrendPoint[];
  bands?: BandDef[];
  domain?: [number, number];
  kind?: "line" | "bar";
  unit?: string;
  format?: (value: number) => string;
  targetValue?: number;
}) {
  const W = 640;
  const H = 240;
  const pad = { l: 44, r: 10, t: 10, b: 26 };
  const numeric = points.map((point) => point.value).filter((value): value is number => value !== null);
  const lo = domain?.[0] ?? Math.min(0, ...numeric);
  const hi = domain?.[1] ?? (Math.max(...numeric, targetValue ?? 0, 1) * 1.15);
  const span = hi - lo || 1;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const y = (value: number) => pad.t + innerH - ((Math.min(Math.max(value, lo), hi) - lo) / span) * innerH;
  const step = innerW / Math.max(points.length, 1);
  const x = (index: number) => pad.l + step * index + step / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => lo + span * fraction);
  const labelEvery = Math.ceil(points.length / 8);

  let path = "";
  let pen = false;
  if (kind === "line") {
    points.forEach((point, index) => {
      if (point.value === null) { pen = false; return; }
      path += `${pen ? "L" : "M"}${x(index).toFixed(1)} ${y(point.value).toFixed(1)} `;
      pen = true;
    });
  }

  return (
    <svg className="trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafik tren ${unit}`}>
      {bands?.map((band, index) => {
        const top = y(band.max ?? hi);
        const bottom = y(band.min ?? lo);
        return <rect key={index} x={pad.l} y={top} width={innerW} height={Math.max(0, bottom - top)} fill={STATUS_COLOR[band.status]} opacity={0.13} />;
      })}
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} stroke="var(--app-border)" strokeWidth="1" />
          <text x={pad.l - 6} y={y(tick) + 4} textAnchor="end" className="trend-axis">{format(Number(tick.toFixed(2)))}</text>
        </g>
      ))}
      {targetValue !== undefined && <line x1={pad.l} x2={W - pad.r} y1={y(targetValue)} y2={y(targetValue)} stroke="var(--app-text)" strokeWidth="1.2" strokeDasharray="5 4" />}
      {kind === "bar"
        ? points.map((point, index) => point.value === null ? null : (
            <rect key={index} x={x(index) - step * 0.3} width={step * 0.6} y={y(point.value)} height={Math.max(1, y(lo) - y(point.value))} rx="2" fill="var(--app-accent)" opacity={0.9} />
          ))
        : <path d={path} fill="none" stroke="var(--app-accent)" strokeWidth="2" strokeLinejoin="round" />}
      {points.map((point, index) => index % labelEvery === 0 && (
        <text key={index} x={x(index)} y={H - 8} textAnchor="middle" className="trend-axis">{point.label}</text>
      ))}
    </svg>
  );
}
