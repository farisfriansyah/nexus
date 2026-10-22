"use client";

import { MonthlySingleWidget } from "../_shared/monthly-parts";
import { MonthlyDetail } from "../_shared/detail";
import { ProgressTarget } from "@/widgets/_primitives/charts";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["kalibrasi"];
const ZONES = [{ from: 0, to: 60, status: "critical" as const }, { from: 60, to: 70, status: "warning" as const }, { from: 70, to: 100, status: "on_target" as const }];

export function Widget(props: WidgetProps) {
  return (
    <MonthlySingleWidget {...props} keys={keys}>
      {(row) => (
        <div className="single-progress">
          <ProgressTarget value={row.value} target={70} max={100} status={row.status} zones={ZONES} />
          {row.planned !== undefined && row.done !== undefined && <small>{row.done} dari {row.planned} alat terkalibrasi</small>}
        </div>
      )}
    </MonthlySingleWidget>
  );
}
export function Detail() {
  return <MonthlyDetail keys={keys} />;
}
