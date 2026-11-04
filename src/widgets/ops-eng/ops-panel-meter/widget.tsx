"use client";

import "./widget.css";
import { LiveTile, useLiveGroup } from "../_shared/live-parts";
import { LiveDetail } from "../_shared/detail";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["panel.volt", "panel.cosphi", "panel.amp", "panel.kwh"];

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} subtitle="Realtime" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="pm">
        <LiveTile keyName="panel.volt" hero />
        <LiveTile keyName="panel.cosphi" />
        <div className="pm-pair">
          <LiveTile keyName="panel.amp" compact spark />
          <LiveTile keyName="panel.kwh" compact spark />
        </div>
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <LiveDetail keys={keys} />;
}
