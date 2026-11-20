import { parseTravoNumber } from "./format";
import type { TravoWeight } from "./schema";

const METRIC_PATHS: Record<string, [phase: "l1" | "l2" | "l3", field: "v" | "i"] | ["total", "pft"]> = {
  "panel.phase.r.voltage": ["l1", "v"],
  "panel.phase.r.current": ["l1", "i"],
  "panel.phase.s.voltage": ["l2", "v"],
  "panel.phase.s.current": ["l2", "i"],
  "panel.phase.t.voltage": ["l3", "v"],
  "panel.phase.t.current": ["l3", "i"],
  "panel.cos_total": ["total", "pft"]
};

export const TRAVO_ALERT_KEYS = Object.keys(METRIC_PATHS);

export function travoMetricValue(weight: TravoWeight, key: string): number | null {
  const path = METRIC_PATHS[key];
  if (!path) return null;
  const [phase, field] = path;
  return parseTravoNumber(phase === "total" ? weight.pft : weight[phase][field]);
}
