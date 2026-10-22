"use client";

import { useMemo } from "react";
import { nowMs } from "@/lib/status/time";
import type { SafetyPayload } from "@/widgets/ops-eng/schemas";
import { useDataset, useEndPeriod } from "../_shared/data";
import { useMounted } from "../_shared/hooks";
import { buildSafetyPayload } from "../_shared/selectors";

export function useSafety(): { payload: SafetyPayload | null } {
  const mounted = useMounted();
  const dataset = useDataset();
  const endPeriod = useEndPeriod();
  const payload = useMemo(() => (mounted ? buildSafetyPayload(dataset, { endPeriod, now: nowMs() }) : null), [mounted, dataset, endPeriod]);
  return { payload };
}
