"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { Props as ReactApexChartProps } from "react-apexcharts";
import "./apex-chart.css";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <span className="apex-chart-loading" aria-hidden="true" />
});

type ApexChartType = NonNullable<ReactApexChartProps["type"]>;

export function ApexChart({
  type,
  series,
  options,
  className,
  label,
  height = "100%"
}: {
  type: ApexChartType;
  series: NonNullable<ApexOptions["series"]>;
  options: ApexOptions;
  className?: string;
  label: string;
  height?: string | number;
}) {
  const resolved: ApexOptions = {
    ...options,
    chart: {
      height: "100%",
      parentHeightOffset: 0,
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: "inherit",
      foreColor: "var(--app-muted)",
      ...options.chart,
      type
    },
    tooltip: { enabled: true, theme: "dark", ...options.tooltip }
  };

  return (
    <div className={`apex-chart ${className ?? ""}`} role="img" aria-label={label}>
      <ReactApexChart type={type} series={series} options={resolved} height={height} width="100%" />
    </div>
  );
}
