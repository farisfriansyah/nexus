"use client";

import "./widget.css";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { STATUS_COLOR, StatusIcon } from "@/widgets/_primitives/status";
import { ApexChart } from "@/widgets/_primitives/apex-chart";
import type { ApexOptions } from "apexcharts";
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
  const points = reading?.trend ?? [];
  const series = [{ name: LABELS[keyName], data: points.map((point) => ({ x: point.t, y: point.v })) }];
  const annotations = [...new Set(def.bands.flatMap((band) => [band.min, band.max]).filter((edge): edge is number => edge !== null && edge > lo && edge < hi))]
    .map((edge) => ({ y: edge, borderColor: "var(--app-border)", strokeDashArray: 3 }));
  const options: ApexOptions = {
    colors: [STATUS_COLOR[status]],
    stroke: { curve: "straight", width: 2 },
    markers: { size: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    xaxis: { type: "datetime", labels: { datetimeUTC: false, format: "HH:mm" }, axisBorder: { color: "var(--app-border)" }, axisTicks: { show: false } },
    yaxis: { min: lo, max: hi, tickAmount: 3, labels: { formatter: (tick) => `${Number(tick).toFixed(def.decimals)}°` } },
    grid: { borderColor: "var(--app-border)", padding: { left: 0, right: 4, top: 0, bottom: 0 } },
    annotations: { yaxis: annotations },
    tooltip: {
      shared: false,
      intersect: false,
      x: { format: "dd MMM yyyy HH:mm:ss" },
      y: { formatter: (point) => Number.isFinite(point) ? `${Number(point).toFixed(def.decimals)} ${def.unit}` : "Tidak ada data" }
    },
    noData: { text: "Belum ada riwayat" }
  };
  return (
    <div className="rt-cell" data-status={status} data-key={keyName}>
      <div className="rt-head">
        <span className="rt-label">{LABELS[keyName]} · suhu</span>
        <span className="rt-value" style={{ color: STATUS_COLOR[status] }}>
          <StatusIcon status={status} />
          <b>{value === null ? "–" : formatFixed(value, def.decimals)}</b><small>{def.unit}</small>
        </span>
      </div>
      <ApexChart className="rt-plot" type="line" label={`Tren suhu ${LABELS[keyName]}`} series={series} options={options} />
    </div>
  );
}

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} subtitle="Suhu reaktor" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="rt-grid-2x2">
        {keys.map((key) => <ReactorChart key={key} keyName={key} />)}
      </div>
    </WidgetCard>
  );
}

export function Detail() {
  return <LiveDetail keys={keys} />;
}
