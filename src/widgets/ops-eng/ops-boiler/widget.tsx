"use client";

import { LiveTile, useLiveGroup } from "../_shared/live-parts";
import { LiveDetail } from "../_shared/detail";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";

export const keys = ["boiler.ma4.stack_temp", "boiler.ma4.pressure"];

export function Widget({ mode, widgetId, title }: WidgetProps) {
  const group = useLiveGroup(keys);
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title} indicatorKeys={keys} subtitle="MA4" status={group.ready ? group.status : undefined} showBadge={mode === "analytic"} loading={!group.ready} stale={group.stale} updatedLabel={group.updatedLabel} source="Plant Vision" pic={group.pic} summary={group.summary}>
      <div className="tiles tiles-2">
        <LiveTile keyName="boiler.ma4.stack_temp" label="Suhu cerobong" />
        <LiveTile keyName="boiler.ma4.pressure" label="Tekanan" />
      </div>
    </WidgetCard>
  );
}
export function Detail() {
  return <LiveDetail keys={keys} />;
}
