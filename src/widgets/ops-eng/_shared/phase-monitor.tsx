"use client";

import "./phase-monitor.css";
import type { CSSProperties } from "react";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { thresholdSentences } from "@/lib/status/describe";
import { BandGauge } from "@/widgets/_primitives/charts";
import { StatusIcon } from "@/widgets/_primitives/status";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { Status } from "@/widgets/ops-eng/schemas";
import type { WidgetProps } from "@/features/widgets-registry/types";
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

const METRICS = {
  current: { title: "Arus Fasa", unit: "A", min: 160, max: 220, ticks: [220, 210, 200, 190, 180, 170, 160], decimals: 2, keys: CURRENT_KEYS, lines: LINES, axis: "Ampere" },
  voltage: { title: "Tegangan Fasa", unit: "V", min: 230, max: 235, ticks: [235, 234, 233, 232, 231, 230], decimals: 1, keys: VOLTAGE_KEYS, lines: VOLTAGE_LINES, axis: "Volt" },
  cos: { title: "Cos Total", unit: "", min: 0, max: 1, ticks: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0], decimals: 3, keys: [COS_KEY], lines: [{ key: COS_KEY, label: "Cos Total", color: "var(--app-accent)" }], axis: "" }
} as const;

const phaseMetricKeys = (phase: PhaseId) => [PHASES[phase].voltage, PHASES[phase].current];

function PhaseCard({ phase, mode, widgetId, title }: WidgetProps & { phase: PhaseId }) {
  const config = PHASES[phase];
  const keys = phaseMetricKeys(phase);
  const group = useLiveGroup(keys);
  const live = group.live;

  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic="Ega" summary={group.summary}>
      <div className="phase-card-content" style={{ "--phase-color": config.color } as CSSProperties}>
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
      </div>
    </WidgetCard>
  );
}

function TrendWidget({ metric, mode, widgetId, title }: WidgetProps & { metric: keyof typeof METRICS }) {
  const config = METRICS[metric];
  const group = useLiveGroup([...config.keys]);
  const live = useLive();
  const plot = { left: 52, right: 8, top: 8, bottom: 25 };
  const width = 400;
  const height = 210;
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const points = Math.max(1, ...config.keys.map((key) => live.readings[key]?.trend.length ?? 0));
  const y = (value: number) => plot.top + ((config.max - value) / (config.max - config.min)) * plotHeight;
  const pathFor = (key: string) => {
    const values = live.readings[key]?.trend.map((point) => point.v) ?? [];
    let path = "";
    let penDown = false;
    values.forEach((value, index) => {
      if (value === null) {
        penDown = false;
        return;
      }
      const x = plot.left + (index / Math.max(points - 1, 1)) * plotWidth;
      path += `${penDown ? "L" : "M"}${x.toFixed(2)} ${y(value).toFixed(2)} `;
      penDown = true;
    });
    return path;
  };
  const lastValues = config.lines.map(({ key }) => live.readings[key]?.value ?? null);
  const currentValue = lastValues.find((value) => value !== null) ?? null;
  const unitLabel = config.unit ? ` (${config.unit})` : "";
  const timePoints = live.readings[config.keys[0]!]?.trend ?? [];
  const timeLabels = [0, 0.5, 1].map((position) => {
    const point = timePoints[Math.round(position * Math.max(timePoints.length - 1, 0))];
    return point ? new Date(point.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "–";
  });

  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={[...config.keys]} subtitle="Realtime" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic="Ega" summary={`${config.title}${unitLabel}: ${lastValues.map((value) => formatFixed(value, config.decimals)).join(", ")}`}>
      <section className="phase-trend" aria-label={`${config.title}${unitLabel}`}>
        <div className="phase-trend-heading">
          {config.lines.length > 1 && <div className="phase-trend-legend">{config.lines.map((line) => <span key={line.key}><i style={{ background: line.color }} />{line.label}</span>)}</div>}
          <strong>{formatFixed(currentValue, config.decimals)}{config.unit ? ` ${config.unit}` : ""}</strong>
        </div>
        <svg className="phase-trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Grafik realtime ${config.title}`}>
          {config.ticks.map((tick) => {
            const tickY = y(tick);
            return (
              <g key={tick}>
                <line className="phase-trend-grid" x1={plot.left} x2={width - plot.right} y1={tickY} y2={tickY} />
                <text className="phase-trend-label" x={plot.left - 5} y={tickY + 3} textAnchor="end">{tick.toFixed(config.decimals)}</text>
              </g>
            );
          })}
          <text className="phase-trend-axis" transform={`translate(11 ${plot.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">{config.axis}</text>
          <line className="phase-trend-baseline" x1={plot.left} x2={width - plot.right} y1={plot.top + plotHeight} y2={plot.top + plotHeight} />
          {config.lines.map((line) => <path key={line.key} d={pathFor(line.key)} fill="none" stroke={line.color} className="phase-trend-line" />)}
          {timeLabels.map((label, index) => {
            const x = plot.left + (index / 2) * plotWidth;
            return <text className="phase-trend-time" key={`time-${index}`} x={x} y={height - 5} textAnchor="middle">{label}</text>;
          })}
        </svg>
      </section>
    </WidgetCard>
  );
}

export function PhaseOneWidget(props: WidgetProps) { return <PhaseCard {...props} phase="r" />; }
export function PhaseTwoWidget(props: WidgetProps) { return <PhaseCard {...props} phase="s" />; }
export function PhaseThreeWidget(props: WidgetProps) { return <PhaseCard {...props} phase="t" />; }
export function CurrentTrendWidget(props: WidgetProps) { return <TrendWidget {...props} metric="current" />; }
export function VoltageTrendWidget(props: WidgetProps) { return <TrendWidget {...props} metric="voltage" />; }
export function CosTotalWidget(props: WidgetProps) { return <TrendWidget {...props} metric="cos" />; }

export function PhaseOneDetail() { return <LiveDetail keys={phaseMetricKeys("r")} />; }
export function PhaseTwoDetail() { return <LiveDetail keys={phaseMetricKeys("s")} />; }
export function PhaseThreeDetail() { return <LiveDetail keys={phaseMetricKeys("t")} />; }
export function CurrentTrendDetail() { return <LiveDetail keys={CURRENT_KEYS} />; }
export function VoltageTrendDetail() { return <LiveDetail keys={VOLTAGE_KEYS} />; }
export function CosTotalDetail() { return <LiveDetail keys={[COS_KEY]} />; }
