import "./charts.css";
import type { BandDef, Status } from "@/widgets/ops-eng/schemas";
import { STATUS_COLOR, STATUS_LABEL } from "./status";
import { Fragment } from "react";
import { ApexChart } from "./apex-chart";
import type { ApexOptions } from "apexcharts";

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

/** ApexCharts sparkline dengan nilai per titik pada tooltip. */
export function Sparkline({ values, status = "neutral", domain, height = 100 }: { values: (number | null)[]; status?: Status; domain?: [number, number]; height?: number }) {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length < 2) return <div className="spark spark-empty" aria-hidden="true" />;
  const options: ApexOptions = {
    chart: { sparkline: { enabled: true } },
    colors: [STATUS_COLOR[status]],
    stroke: { curve: "straight", width: 2 },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: { type: "numeric", labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: domain?.[0], max: domain?.[1], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { show: false, padding: { left: 2, right: 2, top: 2, bottom: 2 } },
    tooltip: { x: { formatter: (index) => `Sampel ${Number(index) + 1}` }, y: { formatter: (value) => Number.isFinite(value) ? String(value) : "–" } }
  };
  return <ApexChart className="spark" type="line" height={height} label="Tren realtime" series={[{ name: "Nilai", data: values.map((y, x) => ({ x, y })) }]} options={options} />;
}

/** Batang mini 12 bulan dengan garis tren; batang null = putus-putus. */
export function MiniBars({ points, statusOf, target, highlightLast = true, trend = true }: { points: { label: string; value: number | null }[]; statusOf: (value: number | null) => Status; target?: number | null; highlightLast?: boolean; trend?: boolean }) {
  const colors = points.map((point, index) => highlightLast && index === points.length - 1 && point.value !== null
    ? STATUS_COLOR[statusOf(point.value)]
    : point.value === null ? "var(--app-border)" : STATUS_COLOR[statusOf(point.value)]);
  const numeric = points.map((point) => point.value);
  const regression = trend ? regressionValues(numeric) : null;
  const series: NonNullable<ApexOptions["series"]> = [{
    name: "Nilai",
    type: "column",
    data: points.map((point) => ({ x: point.label, y: point.value }))
  }];
  const strokeWidths = [0];
  if (regression) {
    series.push({ name: "Tren", type: "line", data: points.map((point, index) => ({ x: point.label, y: point.value === null ? null : regression[index] ?? null })) });
    strokeWidths.push(2);
  }
  const options: ApexOptions = {
    chart: { type: "line", sparkline: { enabled: true } },
    colors: regression ? [({ dataPointIndex }) => colors[dataPointIndex] ?? STATUS_COLOR.neutral, "var(--app-text)"] : [({ dataPointIndex }) => colors[dataPointIndex] ?? STATUS_COLOR.neutral],
    stroke: { width: strokeWidths, curve: "straight", dashArray: regression ? [0, 5] : 0 },
    markers: { size: regression ? [0, 0] : 0, hover: { size: 4 } },
    plotOptions: { bar: { columnWidth: "56%", distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { type: "category", labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, crosshairs: { show: true } },
    yaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    grid: { show: false, padding: { left: 3, right: 3, top: 2, bottom: 2 } },
    annotations: target === null || target === undefined ? undefined : { yaxis: [{ y: target, borderColor: "var(--app-muted)", strokeDashArray: 4 }] },
    tooltip: {
      shared: false,
      intersect: false,
      x: { formatter: (value) => String(value ?? "") },
      y: { formatter: (value) => Number.isFinite(value) ? String(value) : "Tidak ada data" }
    }
  };
  return <ApexChart className="minibars" type="line" label="Tren bulanan" series={series} options={options} />;
}

function regressionValues(values: readonly (number | null)[]): (number | null)[] | null {
  const points = values.flatMap((value, index) => value === null ? [] : [[index, value] as const]);
  if (points.length < 3) return null;
  const n = points.length;
  const sumX = points.reduce((sum, [x]) => sum + x, 0);
  const sumY = points.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumXX = points.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return values.map((value, index) => value === null ? null : slope * index + intercept);
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
