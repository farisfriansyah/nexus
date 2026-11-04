"use client";

import { useSyncExternalStore } from "react";
import { getIndicatorThresholdRevision, subscribeIndicatorThresholds } from "./runtime";

export function useIndicatorThresholdRevision(): number {
  return useSyncExternalStore(subscribeIndicatorThresholds, getIndicatorThresholdRevision, () => 0);
}
