"use client";

import "./widget.css";

import { countByStatus } from "@/lib/status/engine";
import { SegmentGrid, StackedStatusBar } from "@/widgets/_primitives/charts";
import { StatusIcon, STATUS_LABEL } from "@/widgets/_primitives/status";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import { UnitsDetail } from "../_shared/detail";
import { useUnits } from "../_shared/hooks";
import { selectAttention } from "../_shared/selectors";
import type { Status } from "@/widgets/ops-eng/schemas";
import type { WidgetProps } from "@/features/widgets-registry/types";

const shown: Status[] = ["critical", "warning", "no_data", "on_target"];

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const { ready, units } = useUnits();
  const counts = countByStatus(units.map((unit) => unit.status));
  const attention = selectAttention(units, mode === "tv" ? 3 : units.length);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle={ready ? `${units.length} unit dipantau` : undefined} loading={!ready} source="Plant Vision & Jurnal" summary={`${units.length} unit dipantau: ${counts.critical} kritis, ${counts.warning} waspada, ${counts.no_data} tidak ada data, ${counts.on_target} on target`}>
      <div className="summary">
        <div className="summary-counts">
          {shown.map((status) => (
            <div key={status} className={`summary-count s-${status}`} data-status={status}>
              <StatusIcon status={status} /><b>{counts[status]}</b><span>{STATUS_LABEL[status]}</span>
            </div>
          ))}
        </div>
        <StackedStatusBar counts={counts} total={Math.max(units.length, 1)} />
        <SegmentGrid items={units} />
        {ready && attention.length === 0 && <div className="summary-ok"><StatusIcon status="on_target" /><span>Semua unit normal</span></div>}
        {attention.length > 0 && (
          <ul className="summary-attn">
            {attention.map((unit) => <li key={unit.id} data-status={unit.status}><StatusIcon status={unit.status} /><span className="summary-name">{unit.label}</span>{unit.valueText && <b className="summary-val">{unit.valueText}</b>}<small className="summary-pic">{unit.pic}</small></li>)}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <UnitsDetail />;
}
