"use client";

import "./live-parts.css";

import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { aggregateStatus } from "@/lib/status/engine";
import { thresholdSentences } from "@/lib/status/describe";
import { isReadingStale } from "@/lib/status/debounce";
import { BandGauge, Sparkline } from "@/widgets/_primitives/charts";
import { StatusIcon, STATUS_LABEL } from "@/widgets/_primitives/status";
import type { Status } from "@/widgets/ops-eng/schemas";
import { useLive } from "./data";
import { useMounted } from "./hooks";

export function useLiveGroup(keys: string[]) {
  const live = useLive();
  const mounted = useMounted();
  const statuses = keys.map((key) => live.statuses[key] ?? "no_data");
  const countable = keys.filter((key) => getIndicator(key).direction !== "NEUTRAL");
  const status: Status = aggregateStatus(countable.map((key) => live.statuses[key] ?? "no_data"));
  const readings = keys.map((key) => live.readings[key]).filter(Boolean);
  const stale = readings.length > 0 && readings.every((reading) => isReadingStale(reading, getIndicator(reading!.key).staleAfterSec, live.now));
  const lastTs = readings.reduce((max, reading) => Math.max(max, reading!.ts), 0);
  const summary = keys.map((key, index) => {
    const def = getIndicator(key);
    const reading = live.readings[key];
    const shown = reading && statuses[index] !== "no_data" && reading.value !== null;
    return `${def.name} ${shown ? `${formatFixed(reading!.value!, def.decimals)} ${def.unit}` : "tidak ada data"}, status ${STATUS_LABEL[def.direction === "NEUTRAL" ? "neutral" : statuses[index]!]}`;
  }).join("; ");
  const updatedLabel = lastTs ? new Date(lastTs).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") : undefined;
  const pic = getIndicator(keys[0]!).pic;
  return { ready: mounted && live.ready, status, statuses, stale, lastTs, live, summary, updatedLabel, pic };
}

export function LiveTile({ keyName, label, compact = false, hero = false, spark = false }: { keyName: string; label?: string; compact?: boolean; hero?: boolean; spark?: boolean }) {
  const live = useLive();
  const def = getIndicator(keyName);
  const reading = live.readings[keyName];
  const status: Status = def.direction === "NEUTRAL" ? "neutral" : (live.statuses[keyName] ?? "no_data");
  const value = reading && status !== "no_data" ? reading.value : null;
  const hasBands = def.bands.length > 0 && def.domain;
  const tooltip = thresholdSentences(def).join(" Â· ");
  return (
    <div className={`ltile s-tile-${status} ${compact ? "is-compact" : ""} ${hero ? "is-hero" : ""}`} data-status={status} data-key={keyName} title={tooltip || undefined}>
      <div className="ltile-head">
        <span className="ltile-label">{label ?? def.label}</span>
        <span className="ltile-state"><StatusIcon status={status} /><span className="sr-only">{STATUS_LABEL[status]}</span></span>
      </div>
      <div className="ltile-value">
        <b>{value === null ? "â€“" : formatFixed(value, def.decimals)}</b>
        <small>{def.unit}</small>
      </div>
      {hasBands && <BandGauge bands={def.bands} domain={def.domain!} value={value} status={status} tooltip={tooltip} />}
      {(!compact || spark) && <div className="ltile-spark"><Sparkline values={reading ? reading.trend.map((point) => point.v) : []} status={status === "no_data" ? "no_data" : status} domain={def.domain} /></div>}
    </div>
  );
}
