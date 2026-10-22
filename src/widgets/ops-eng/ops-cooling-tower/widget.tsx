"use client";

import { LiveTile, useLiveGroup } from "../_shared/live-parts";
import { LiveDetail } from "../_shared/detail";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["ct.ma1.temp", "ct.ma4.temp"];

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} subtitle="Suhu air" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="tiles tiles-2">
        <LiveTile keyName="ct.ma1.temp" label="MA1" />
        <LiveTile keyName="ct.ma4.temp" label="MA4" />
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <LiveDetail keys={keys} />;
}
