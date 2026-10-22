"use client";

import "./widget.css";

import { countByStatus } from "@/lib/status/engine";
import { SegmentGrid } from "@/widgets/_primitives/charts";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import { UnitsDetail } from "../_shared/detail";
import { useUnits } from "../_shared/hooks";
import type { WidgetProps } from "@/features/widgets-registry/types";

const MONTHLY_GROUPS = new Set(["Downtime", "Maintainability", "Governance"]);

/** Pencapaian bulan berjalan: porsi indikator bulanan yang on target. */
export function Widget({ mode, widgetId, title }: WidgetProps) {
  const { ready, units } = useUnits();
  const monthly = units.filter((unit) => MONTHLY_GROUPS.has(unit.group) && unit.status !== "neutral");
  const counts = countByStatus(monthly.map((unit) => unit.status));
  const onTarget = counts.on_target;
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle="Indikator bulanan on target" loading={!ready} source="Jurnal harian" summary={`${onTarget} dari ${monthly.length} indikator bulanan on target`}>
      <div className="attain" role="group" aria-label={`${onTarget} dari ${monthly.length} indikator bulanan on target`}>
        <div className="attain-main"><b>{onTarget}</b><span>dari {monthly.length}</span></div>
        <div className="attain-sub">indikator on target</div>
        <SegmentGrid items={monthly} />
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <UnitsDetail />;
}
