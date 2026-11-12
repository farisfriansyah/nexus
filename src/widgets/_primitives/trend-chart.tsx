import "./trend-chart.css";
import type { BandDef } from "@/widgets/ops-eng/schemas";
import { STATUS_COLOR } from "./status";
import { fitNumericDomain } from "./chart-scale";
import { ApexChart } from "./apex-chart";
import type { ApexOptions } from "apexcharts";

export interface TrendPoint { label: string; value: number | null }

/** ApexCharts history view with value and category available on hover. */
export function TrendChart({ points, bands, domain, kind = "line", unit = "", format = (v: number) => String(v), targetValue }: {
  points: TrendPoint[];
  bands?: BandDef[];
  domain?: [number, number];
  kind?: "line" | "bar";
  unit?: string;
  format?: (value: number) => string;
  targetValue?: number;
}) {
  const numeric = points.map((point) => point.value).filter((value): value is number => value !== null);
  const [lo, hi] = fitNumericDomain([...numeric, targetValue], domain);
  const regression = kind === "bar" ? regressionFor(points.map((point) => point.value)) : null;
  const series: NonNullable<ApexOptions["series"]> = [{
    name: unit ? `Nilai (${unit})` : "Nilai",
    type: kind === "bar" ? "bar" : "line",
    data: points.map((point) => ({ x: point.label, y: point.value }))
  }];
  const strokeWidths = [kind === "bar" ? 0 : 2];
  if (regression) {
    series.push({ name: "Tren", type: "line", data: points.map((point, index) => ({ x: point.label, y: point.value === null ? null : regression[index] ?? null })) });
    strokeWidths.push(2);
  }
  const options: ApexOptions = {
    colors: regression ? ["var(--app-accent)", "var(--app-text)"] : ["var(--app-accent)"],
    stroke: { width: strokeWidths, curve: "straight", dashArray: regression ? [0, 5] : 0 },
    markers: { size: 3, hover: { size: 6 } },
    plotOptions: { bar: { columnWidth: "56%", borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      type: "category",
      tickAmount: Math.min(points.length, 8),
      labels: { rotate: -25, trim: true, hideOverlappingLabels: true },
      axisBorder: { color: "var(--app-border)" },
      axisTicks: { show: false },
      crosshairs: { show: true }
    },
    yaxis: {
      min: lo,
      max: hi,
      tickAmount: 4,
      labels: { formatter: (value) => format(Number(value)) }
    },
    grid: { borderColor: "var(--app-border)", padding: { left: 4, right: 8, top: 0, bottom: 0 } },
    annotations: {
      yaxis: [
        ...(bands ?? []).map((band) => ({
          y: band.min ?? lo,
          y2: band.max ?? hi,
          borderColor: "transparent",
          fillColor: STATUS_COLOR[band.status],
          opacity: 0.08
        })),
        ...(targetValue === undefined ? [] : [{ y: targetValue, borderColor: "var(--app-text)", strokeDashArray: 5 }])
      ]
    },
    tooltip: {
      shared: false,
      intersect: false,
      x: { formatter: (value) => String(value ?? "") },
      y: { formatter: (value) => Number.isFinite(value) ? `${format(Number(value))}${unit ? ` ${unit}` : ""}` : "Tidak ada data" }
    },
    noData: { text: "Tidak ada data" }
  };
  return <ApexChart className="trend" type={kind} label={`Grafik tren ${unit}`} series={series} options={options} height={240} />;
}

function regressionFor(values: readonly (number | null)[]): (number | null)[] | null {
  const numeric = values.flatMap((value, index) => value === null ? [] : [[index, value] as const]);
  if (numeric.length < 3) return null;
  const n = numeric.length;
  const sx = numeric.reduce((sum, [x]) => sum + x, 0);
  const sy = numeric.reduce((sum, [, y]) => sum + y, 0);
  const sxy = numeric.reduce((sum, [x, y]) => sum + x * y, 0);
  const sxx = numeric.reduce((sum, [x]) => sum + x * x, 0);
  const denominator = n * sxx - sx * sx;
  if (!denominator) return null;
  const slope = (n * sxy - sx * sy) / denominator;
  const intercept = (sy - slope * sx) / n;
  return values.map((value, index) => value === null ? null : slope * index + intercept);
}
