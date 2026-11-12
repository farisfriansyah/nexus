"use client";

import "./phase-monitor.css";
import type { CSSProperties } from "react";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { useTravoLiveGroup, type TravoLiveGroup } from "@/features/travo/live";
import { useTravoUnit } from "@/features/travo/provider";
import { useTravo } from "@/features/travo/data";
import { formatTravoTimestamp, formatTravoValue, isTravoReadingStale } from "@/features/travo/format";
import { ENERGY_FIELDS, SUMMARY_FIELDS, formatTotalField } from "@/features/travo/overview";
import type { TravoWeight } from "@/features/travo/schema";
import { thresholdSentences } from "@/lib/status/describe";
import { BandGauge } from "@/widgets/_primitives/charts";
import { StatusIcon } from "@/widgets/_primitives/status";
import { fitNumericDomain, fitTimeWindow } from "@/widgets/_primitives/chart-scale";
import { ApexChart } from "@/widgets/_primitives/apex-chart";
import type { ApexOptions } from "apexcharts";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { Status } from "@/widgets/ops-eng/schemas";
import type { WidgetProps } from "@/features/widgets-registry/types";
import { ValueTable } from "./detail";
import { useLive } from "./data";
import { LiveDetail } from "./detail";
import { useLiveGroup } from "./live-parts";

type PhaseId = "r" | "s" | "t";
type Line = { key: string; label: string; color: string };

const PHASES: Record<PhaseId, { line: string; phase: string; color: string; voltage: string; current: string; voltageLabel: string; currentLabel: string }> = {
  r: { line: "L1", phase: "FASA R", color: "#ef4444", voltage: "panel.phase.r.voltage", current: "panel.phase.r.current", voltageLabel: "Ua", currentLabel: "Ia" },
  s: { line: "L2", phase: "FASA S", color: "#5275ff", voltage: "panel.phase.s.voltage", current: "panel.phase.s.current", voltageLabel: "Ub", currentLabel: "Ib" },
  t: { line: "L3", phase: "FASA T", color: "#f59e0b", voltage: "panel.phase.t.voltage", current: "panel.phase.t.current", voltageLabel: "Uc", currentLabel: "Ic" }
};

const LINES: Line[] = [
  { key: "panel.phase.r.current", label: "L1", color: PHASES.r.color },
  { key: "panel.phase.s.current", label: "L2", color: PHASES.s.color },
  { key: "panel.phase.t.current", label: "L3", color: PHASES.t.color }
];
const CURRENT_KEYS = LINES.map((line) => line.key);
const VOLTAGE_KEYS = ["panel.phase.r.voltage", "panel.phase.s.voltage", "panel.phase.t.voltage"];
const VOLTAGE_LINES: Line[] = VOLTAGE_KEYS.map((key, index) => ({ ...LINES[index]!, key }));
const COS_KEY = "panel.cos_total";
const CHART_WINDOW_MS = 12 * 60 * 60 * 1000;

const METRICS = {
  current: { title: "Arus Fasa", unit: "A", min: 160, max: 220, decimals: 2, keys: CURRENT_KEYS, lines: LINES },
  voltage: { title: "Tegangan Fasa", unit: "V", min: 230, max: 235, decimals: 1, keys: VOLTAGE_KEYS, lines: VOLTAGE_LINES },
  cos: { title: "Cos Total", unit: "", min: 0, max: 1, decimals: 3, keys: [COS_KEY], lines: [{ key: COS_KEY, label: "Cos Total", color: "var(--app-accent)" }] }
} as const;

const phaseMetricKeys = (phase: PhaseId) => [PHASES[phase].voltage, PHASES[phase].current];

function PhaseCard({ phase, mode, widgetId, title }: WidgetProps & { phase: PhaseId }) {
  const unit = useTravoUnit();
  return unit
    ? <TravoPhaseCard phase={phase} mode={mode} widgetId={widgetId} title={title} unit={unit} />
    : <SimulatedPhaseCard phase={phase} mode={mode} widgetId={widgetId} title={title} />;
}

type PhaseGroup = Pick<TravoLiveGroup, "ready" | "status" | "stale" | "live" | "summary" | "updatedLabel">;

function PhaseCardView({ phase, mode, widgetId, title, group, error, retry, simulated = true, phaseData }: WidgetProps & {
  phase: PhaseId;
  group: PhaseGroup;
  error?: string;
  retry?: () => void;
  simulated?: boolean;
  phaseData?: TravoWeight["l1"];
}) {
  const config = PHASES[phase];
  const keys = phaseMetricKeys(phase);
  const live = group.live;

  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready && !error} error={error} onRetry={retry} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" showDummyBadge={simulated} pic="Ega" summary={group.summary}>
      <div className={`phase-card-content${phaseData ? " phase-card-extended" : ""}`} style={{ "--phase-color": config.color } as CSSProperties}>
        {(["voltage", "current"] as const).map((metric) => {
          const key = config[metric];
          const def = getIndicator(key);
          const reading = live.readings[key];
          const status: Status = def.bands.length === 0 ? "neutral" : live.statuses[key] ?? "no_data";
          const value = reading && status !== "no_data" ? reading.value : null;
          const range: [number, number] = metric === "voltage" ? [220, 245] : [0, 250];
          const percent = value === null ? 0 : Math.min(100, Math.max(0, ((value - range[0]) / (range[1] - range[0])) * 100));
          const label = metric === "voltage" ? "Tegangan Fasa-N" : "Arus Fasa";
          const symbol = metric === "voltage" ? config.voltageLabel : config.currentLabel;
          return (
            <div className="phase-card-reading" key={key} data-status={status}>
              <div className="phase-card-label"><b>{symbol}</b><span>{label}</span>{def.bands.length > 0 && <StatusIcon status={status} />}</div>
              <strong>{formatFixed(value, def.decimals)}<small>{def.unit ? ` ${def.unit}` : ""}</small></strong>
              {def.bands.length > 0
                ? <BandGauge bands={def.bands} domain={range} value={value} status={status} tooltip={thresholdSentences(def).join(" \u00b7 ")} />
                : <i className={`phase-card-meter s-${status}`} style={{ "--meter-width": `${percent}%` } as CSSProperties} />}
              <div className="phase-card-scale" aria-hidden="true"><span>{range[0]}</span><span>{range[1]}</span></div>
            </div>
          );
        })}
        {phaseData && <div className="phase-card-extra">
          <div><strong>{formatTravoValue(phaseData.kw, 2)} kW</strong><span>P{phase === "r" ? "a" : phase === "s" ? "b" : "c"} (kW)</span></div>
          <div><strong>{formatTravoValue(phaseData.pf, 3)}</strong><span>cosφ {config.line}</span></div>
          <div><strong>{formatTravoValue(phaseData.vl, 2)} kvar</strong><span>Q{phase === "r" ? "1" : phase === "s" ? "2" : "3"} (kvar)</span></div>
        </div>}
      </div>
    </WidgetCard>
  );
}

function TravoPhaseCard({ unit, ...props }: WidgetProps & { phase: PhaseId; unit: number }) {
  const group = useTravoLiveGroup(phaseMetricKeys(props.phase), unit);
  const query = useTravo(unit);
  const phaseKey = props.phase === "r" ? "l1" : props.phase === "s" ? "l2" : "l3";
  return <PhaseCardView {...props} group={group} error={group.error} retry={group.retry} simulated={false} phaseData={query.data?.processedWeight[phaseKey]} />;
}

function SimulatedPhaseCard(props: WidgetProps & { phase: PhaseId }) {
  const group = useLiveGroup(phaseMetricKeys(props.phase));
  return <PhaseCardView {...props} group={group} />;
}

function TrendWidget({ metric, mode, widgetId, title }: WidgetProps & { metric: keyof typeof METRICS }) {
  const unit = useTravoUnit();
  return unit
    ? <TravoTrendWidget metric={metric} mode={mode} widgetId={widgetId} title={title} unit={unit} />
    : <SimulatedTrendWidget metric={metric} mode={mode} widgetId={widgetId} title={title} />;
}

function TrendWidgetView({ metric, mode, widgetId, title, group, error, retry, simulated = true }: WidgetProps & {
  metric: keyof typeof METRICS;
  group: PhaseGroup;
  error?: string;
  retry?: () => void;
  simulated?: boolean;
}) {
  const config = METRICS[metric];
  const live = group.live;
  const sourceSeries = Object.fromEntries(config.keys.map((key) => {
    const reading = live.readings[key];
    const trend = reading?.trend ?? [];
    const hasCurrent = reading && Number.isFinite(reading.ts) && reading.value !== null
      && !trend.some((point) => point.t === reading.ts);
    return [key, hasCurrent ? [...trend, { t: reading.ts, v: reading.value }] : trend];
  }));
  const timeWindow = fitTimeWindow(sourceSeries, CHART_WINDOW_MS);
  const domain = fitNumericDomain(
    config.keys.flatMap((key) => {
      return timeWindow.series[key]?.map((point) => point.v) ?? [];
    }),
    [config.min, config.max]
  );
  const series = config.lines.map((line) => ({
    name: line.label,
    data: (timeWindow.series[line.key] ?? []).map((point) => ({ x: point.t, y: point.v }))
  }));
  const options: ApexOptions = {
    colors: config.lines.map((line) => line.color),
    stroke: { curve: "straight", width: 2.5 },
    markers: { size: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      min: timeWindow.start,
      max: timeWindow.end,
      tickAmount: 2,
      labels: { datetimeUTC: false, format: "HH:mm" },
      axisBorder: { color: "var(--app-border)" },
      axisTicks: { show: false }
    },
    yaxis: {
      min: domain[0],
      max: domain[1],
      tickAmount: 4,
      labels: { formatter: (value) => Number(value).toFixed(config.decimals) }
    },
    grid: { borderColor: "var(--app-border)", padding: { left: 0, right: 4, top: 0, bottom: 0 } },
    legend: { show: false },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: "dd MMM yyyy HH:mm:ss" },
      y: { formatter: (value) => Number.isFinite(value) ? `${Number(value).toFixed(config.decimals)}${config.unit ? ` ${config.unit}` : ""}` : "–" }
    },
    noData: { text: "Belum ada riwayat" }
  };
  const lastValues = config.lines.map(({ key }) => live.readings[key]?.value ?? null);
  const currentValue = lastValues.find((value) => value !== null) ?? null;
  const unitLabel = config.unit ? ` (${config.unit})` : "";
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={[...config.keys]} subtitle="Realtime" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready && !error} error={error} onRetry={retry} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" showDummyBadge={simulated} pic="Ega" summary={`${config.title}${unitLabel}: ${lastValues.map((value) => formatFixed(value, config.decimals)).join(", ")}`}>
      <section className="phase-trend" aria-label={`${config.title}${unitLabel}`}>
        <div className="phase-trend-heading">
          {config.lines.length > 1 && <div className="phase-trend-legend">{config.lines.map((line) => <span key={line.key}><i style={{ background: line.color }} />{line.label}</span>)}</div>}
          <strong>{formatFixed(currentValue, config.decimals)}{config.unit ? ` ${config.unit}` : ""}</strong>
        </div>
        <ApexChart className="phase-trend-apex" type="line" label={`Grafik realtime ${config.title}`} series={series} options={options} />
      </section>
    </WidgetCard>
  );
}

function TravoTrendWidget({ unit, ...props }: WidgetProps & { metric: keyof typeof METRICS; unit: number }) {
  const group = useTravoLiveGroup([...METRICS[props.metric].keys], unit);
  return <TrendWidgetView {...props} group={group} error={group.error} retry={group.retry} simulated={false} />;
}

function SimulatedTrendWidget(props: WidgetProps & { metric: keyof typeof METRICS }) {
  const group = useLiveGroup([...METRICS[props.metric].keys]);
  const live = useLive();
  return <TrendWidgetView {...props} group={{ ...group, live }} />;
}

function TravoDetail({ keys, unit }: { keys: string[]; unit: number }) {
  const query = useTravo(unit);
  if (query.isPending) return <p className="muted">Memuat data Travo {unit}…</p>;
  if (!query.data) return <p className="muted" role="alert">{query.error instanceof Error ? query.error.message : "Data Travo tidak tersedia."}</p>;

  const paths: Record<string, { label: string; phase: "l1" | "l2" | "l3"; field: "v" | "i" } | { label: string; total: "pft" }> = {
    "panel.phase.r.voltage": { label: "Fasa 1 · Tegangan", phase: "l1", field: "v" },
    "panel.phase.r.current": { label: "Fasa 1 · Arus", phase: "l1", field: "i" },
    "panel.phase.s.voltage": { label: "Fasa 2 · Tegangan", phase: "l2", field: "v" },
    "panel.phase.s.current": { label: "Fasa 2 · Arus", phase: "l2", field: "i" },
    "panel.phase.t.voltage": { label: "Fasa 3 · Tegangan", phase: "l3", field: "v" },
    "panel.phase.t.current": { label: "Fasa 3 · Arus", phase: "l3", field: "i" },
    "panel.cos_total": { label: "Cos Total", total: "pft" }
  };
  const value = (weight: TravoWeight, key: string) => {
    const path = paths[key];
    if (!path) return "–";
    return "total" in path ? String(weight[path.total]) : String(weight[path.phase][path.field]);
  };

  const phaseKey = keys.length !== 2 ? null : keys[0]?.includes(".phase.r.") ? "l1" : keys[0]?.includes(".phase.s.") ? "l2" : keys[0]?.includes(".phase.t.") ? "l3" : null;
  const phaseRows = phaseKey ? ([
    ["Daya aktif fase (kW)", "kw"],
    ["Faktor daya fase", "pf"],
    ["Daya reaktif fase (kvar)", "vl"]
  ] as const).map(([label, field]) => [label, String(query.data!.processedWeight[phaseKey][field]), String(query.data!.rawWeight[phaseKey][field])]) : [];
  return (
    <div className="detail">
      <p className="muted">Travo {unit} · Timestamp API {query.data.timestamp}</p>
      <ValueTable
        head={["Metrik", "Nilai terolah", "Nilai mentah"]}
        rows={[...keys.map((key) => [
          paths[key]?.label ?? getIndicator(key).name,
          value(query.data.processedWeight, key),
          value(query.data.rawWeight, key)
        ]), ...phaseRows]}
      />
    </div>
  );
}

function TravoOverviewWidget({ mode, widgetId, title, kind }: WidgetProps & { kind: "energy" | "summary" }) {
  const unit = useTravoUnit();
  const query = useTravo(unit ?? 1, unit !== null);
  const data = unit ? query.data : undefined;
  const weight = data?.processedWeight;
  const stale = data ? isTravoReadingStale(data.timestamp, query.dataUpdatedAt) || query.isError : false;
  const error = !unit ? "Widget ini memerlukan slide Travo 1–4." : !data && query.isError ? query.error.message : undefined;
  const entries = kind === "energy" ? ENERGY_FIELDS.slice(1) : SUMMARY_FIELDS;
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} loading={Boolean(unit && !data && !error)} error={error} onRetry={() => { void query.refetch(); }} stale={stale} updatedLabel={data ? formatTravoTimestamp(data.timestamp) : undefined} source="Plant Vision" showDummyBadge={false}>
      <div className={`travo-overview travo-overview-${kind}`}>
        {kind === "energy" && <div className="travo-energy-value"><strong>{formatTotalField(weight, ENERGY_FIELDS[0]!)}</strong><span>kWh — Akumulasi Konsumsi</span></div>}
        <dl>{entries.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{formatTotalField(weight, field)}{field.unit ? ` ${field.unit}` : ""}</dd></div>)}</dl>
      </div>
    </WidgetCard>
  );
}

export function TravoEnergyWidget(props: WidgetProps) { return <TravoOverviewWidget {...props} kind="energy" />; }
export function TravoSummaryWidget(props: WidgetProps) { return <TravoOverviewWidget {...props} kind="summary" />; }

function TravoOverviewDetail({ kind }: { kind: "energy" | "summary" }) {
  const unit = useTravoUnit();
  const query = useTravo(unit ?? 1, unit !== null);
  if (!unit) return <p role="alert">Widget ini memerlukan slide Travo 1–4.</p>;
  if (query.isPending) return <p className="muted">Memuat data Travo {unit}…</p>;
  if (!query.data) return <p role="alert">{query.error?.message ?? "Data Travo tidak tersedia."}</p>;
  const { rawWeight, processedWeight, timestamp } = query.data;
  const fields = kind === "energy" ? ENERGY_FIELDS : SUMMARY_FIELDS;
  return <div className="detail"><p className="muted">Travo {unit} · Timestamp API {timestamp}</p>
    <ValueTable head={["Metrik", "Nilai terolah", "Nilai mentah"]} rows={fields.map((field) => [
      `${field.label}${field.unit ? ` (${field.unit})` : ""}`, formatTotalField(processedWeight, field), formatTotalField(rawWeight, field)
    ])} />
  </div>;
}

export function TravoEnergyDetail() { return <TravoOverviewDetail kind="energy" />; }
export function TravoSummaryDetail() { return <TravoOverviewDetail kind="summary" />; }

function PhaseDetail({ keys }: { keys: string[] }) {
  const unit = useTravoUnit();
  return unit ? <TravoDetail keys={keys} unit={unit} /> : <LiveDetail keys={keys} />;
}

export function PhaseOneWidget(props: WidgetProps) { return <PhaseCard {...props} phase="r" />; }
export function PhaseTwoWidget(props: WidgetProps) { return <PhaseCard {...props} phase="s" />; }
export function PhaseThreeWidget(props: WidgetProps) { return <PhaseCard {...props} phase="t" />; }
export function CurrentTrendWidget(props: WidgetProps) { return <TrendWidget {...props} metric="current" />; }
export function VoltageTrendWidget(props: WidgetProps) { return <TrendWidget {...props} metric="voltage" />; }
export function CosTotalWidget(props: WidgetProps) { return <TrendWidget {...props} metric="cos" />; }

export function PhaseOneDetail() { return <PhaseDetail keys={phaseMetricKeys("r")} />; }
export function PhaseTwoDetail() { return <PhaseDetail keys={phaseMetricKeys("s")} />; }
export function PhaseThreeDetail() { return <PhaseDetail keys={phaseMetricKeys("t")} />; }
export function CurrentTrendDetail() { return <PhaseDetail keys={CURRENT_KEYS} />; }
export function VoltageTrendDetail() { return <PhaseDetail keys={VOLTAGE_KEYS} />; }
export function CosTotalDetail() { return <PhaseDetail keys={[COS_KEY]} />; }
