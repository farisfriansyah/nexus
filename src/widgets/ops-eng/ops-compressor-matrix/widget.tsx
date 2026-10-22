"use client";

import "./widget.css";

import { compressorIds, compressorNames } from "@/config/ops-eng/indicators";
import { LiveTile, useLiveGroup } from "../_shared/live-parts";
import { LiveDetail } from "../_shared/detail";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = compressorIds.flatMap((unit) => [`compressor.${unit}.temp`, `compressor.${unit}.pressure`]);

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  const normal = compressorIds.filter((unit) => group.statuses[keys.indexOf(`compressor.${unit}.temp`)] === "on_target" && group.statuses[keys.indexOf(`compressor.${unit}.pressure`)] === "on_target").length;
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle={group.ready ? `${normal}/${compressorIds.length} normal` : undefined} status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={`${normal} dari ${compressorIds.length} kompresor normal. ${group.summary}`}>
      <div className="cmatrix">
        {compressorIds.map((unit) => (
          <div className="cmatrix-row" key={unit}>
            <span className="cmatrix-name">{compressorNames[unit]}</span>
            <LiveTile keyName={`compressor.${unit}.temp`} label="Suhu" compact />
            <LiveTile keyName={`compressor.${unit}.pressure`} label="Tekanan" compact />
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <LiveDetail keys={keys} />;
}
