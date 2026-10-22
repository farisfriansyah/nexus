import "./charts.css";
import type { BandDef, Status } from "@/widgets/ops-eng/schemas";
import { STATUS_COLOR, STATUS_LABEL } from "./status";
import { Fragment } from "react";

export function BigNumber({ value, unit, status, size = "lg" }: { value: string; unit?: string; status?: Status; size?: "md" | "lg" | "xl" }) {
  return (
    <div className={`bignum bignum-${size}`} data-status={status}>
      <span className="bignum-value">{value}</span>
      {unit && <span className="bignum-unit">{unit}</span>}
    </div>
  );
}

export function Delta({ text, tone, arrow }: { text: string; tone: "good" | "bad" | "neutral"; arrow: "up" | "down" | "flat" }) {
  const symbol = arrow === "up" ? "▲" : arrow === "down" ? "▼" : "■";
  return <span className={`delta delta-${tone}`}><span aria-hidden="true">{symbol}</span> {text}</span>;
}

/** Sparkline SVG; stroke tidak ikut skala. */
export function Sparkline({ values, status = "neutral", domain, height = 100 }: { values: (number | null)[]; status?: Status; domain?: [number, number]; height?: number }) {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length < 2) return <div className="spark spark-empty" aria-hidden="true" />;
  const lo = domain?.[0] ?? Math.min(...numeric);
  const hi = domain?.[1] ?? Math.max(...numeric);
  const span = hi - lo || 1;
  const x = (index: number) => (index / (values.length - 1)) * 100;
  const y = (value: number) => height - ((Math.min(Math.max(value, lo), hi) - lo) / span) * (height - 8) - 4;
  let path = "";
  let pen = false;
  values.forEach((value, index) => {
    if (value === null) { pen = false; return; }
    path += `${pen ? "L" : "M"}${x(index).toFixed(2)} ${y(value).toFixed(2)} `;
    pen = true;
  });
  return (
    <svg className="spark" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label="Tren">
      <path d={path} fill="none" stroke={STATUS_COLOR[status]} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Batang mini 12 bulan; batang null = putus-putus. */
export function MiniBars({ points, statusOf, target, highlightLast = true }: { points: { label: string; value: number | null }[]; statusOf: (value: number | null) => Status; target?: number | null; highlightLast?: boolean }) {
  const numeric = points.map((point) => point.value).filter((value): value is number => value !== null);
  const max = Math.max(...numeric, target ?? 0, 1) * 1.1;
  return (
    <div className="minibars" role="img" aria-label="Tren 12 bulan">
      {points.map((point, index) => {
        const status = statusOf(point.value);
        const last = highlightLast && index === points.length - 1;
        return (
          <span key={point.label + index} className={`minibar ${last ? "is-last" : ""} ${point.value === null ? "is-null" : ""}`} title={point.label}>
            <i style={{ height: point.value === null ? "12%" : `${Math.max(4, (point.value / max) * 100)}%`, background: point.value === null ? "transparent" : STATUS_COLOR[status] }} />
          </span>
        );
      })}
      {target !== null && target !== undefined && <span className="minibars-target" style={{ bottom: `${(target / max) * 100}%` }} aria-hidden="true" />}
    </div>
  );
}

/** Gauge berbasis zona: segmen band + penanda nilai. Angka ambang hanya di tooltip. */
export function BandGauge({ bands, domain, value, status, tooltip }: { bands: BandDef[]; domain: [number, number]; value: number | null; status: Status; tooltip?: string }) {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  const segments = [...bands].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity)).map((band) => {
    const from = pct(band.min ?? lo);
    const to = pct(band.max ?? hi);
    return { band, from, width: Math.max(0, to - from) };
  });
  return (
    <div className="gauge" title={tooltip} role="img" aria-label={`Posisi nilai: ${STATUS_LABEL[status]}`}>
      <div className="gauge-track">
        {segments.map(({ band, from, width }, index) => (
          <span key={index} className={`gauge-seg gs-${band.status}`} style={{ left: `${from}%`, width: `${width}%` }} />
        ))}
        {value !== null && <span className="gauge-marker" style={{ left: `${pct(value)}%`, borderColor: STATUS_COLOR[status] }} />}
      </div>
    </div>
  );
}

/** Bullet bar: realisasi vs target pada zona. */
export function BulletBar({ value, target, max, status }: { value: number | null; target: number; max: number; status: Status }) {
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));
  return (
    <div className="bullet" role="img" aria-label="Realisasi terhadap target">
      <div className="bullet-track">
        {value !== null && <span className="bullet-fill" style={{ width: `${pct(value)}%`, background: STATUS_COLOR[status] }} />}
        <span className="bullet-target" style={{ left: `${pct(target)}%` }} />
      </div>
    </div>
  );
}

/** Bar progres 0..max dengan zona band, penanda target, dan tanda overflow bila nilai melebihi max. */
export function ProgressTarget({ value, target, status, max = target, zones }: { value: number | null; target: number; status: Status; max?: number; zones?: { from: number; to: number; status: Status }[] }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const overflow = value !== null && value > max;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={max}>
      {zones?.map((zone) => <i key={zone.from} className="progress-zone" style={{ left: `${(zone.from / max) * 100}%`, width: `${((zone.to - zone.from) / max) * 100}%`, background: STATUS_COLOR[zone.status] }} />)}
      <span style={{ width: `${pct}%`, background: STATUS_COLOR[status] }} />
      {target < max && <b className="progress-marker" style={{ left: `${(target / max) * 100}%` }} />}
      {overflow && <em className="progress-over" aria-label="Nilai melebihi skala">?</em>}
    </div>
  );
}

/** Deretan kotak status (satu kotak per unit). */
export function SegmentGrid({ items }: { items: { id: string; label: string; status: Status }[] }) {
  return (
    <ul className="seggrid">
      {items.map((item) => (
        <li key={item.id} className={`seg s-${item.status}`} title={`${item.label}: ${STATUS_LABEL[item.status]}`}><span className="sr-only">{item.label}: {STATUS_LABEL[item.status]}</span></li>
      ))}
    </ul>
  );
}

export function StackedStatusBar({ counts, total }: { counts: Partial<Record<Status, number>>; total: number }) {
  const order: Status[] = ["critical", "warning", "no_data", "on_target"];
  return (
    <div className="stackbar" role="img" aria-label="Komposisi status">
      {order.map((status) => {
        const count = counts[status] ?? 0;
        if (!count) return <Fragment key={status} />;
        return <span key={status} className={`s-${status}`} style={{ flexGrow: count / total }} />;
      })}
    </div>
  );
}

/** Garis waktu kejadian pada jendela [start, end]. */
export function EventTimeline({ events, windowStart, windowEnd, status }: { events: number[]; windowStart: number; windowEnd: number; status: Status }) {
  const span = windowEnd - windowStart || 1;
  return (
    <div className="timeline" role="img" aria-label={`${events.length} kejadian`}>
      <span className="timeline-line" />
      {events.map((time, index) => (
        <span key={index} className="timeline-dot" style={{ left: `${Math.min(100, Math.max(0, ((time - windowStart) / span) * 100))}%`, background: STATUS_COLOR[status] }} />
      ))}
    </div>
  );
}

export function HeatStrip({ cells }: { cells: { label: string; status: Status; text?: string }[] }) {
  return (
    <div className="heatstrip" role="img" aria-label="Riwayat status">
      {cells.map((cell, index) => (
        <span key={index} className={`s-${cell.status}`} data-status={cell.status} title={`${cell.label}: ${STATUS_LABEL[cell.status]}`}>
          {cell.text !== undefined && <small>{cell.text}</small>}
        </span>
      ))}
    </div>
  );
}
