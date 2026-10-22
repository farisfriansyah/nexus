"use client";

import { useMemo } from "react";
import { nowMs } from "@/lib/status/time";
import type { MtbfPayload } from "@/widgets/ops-eng/schemas";
import { useDataset, useEndPeriod } from "../_shared/data";
import { useMounted } from "../_shared/hooks";
import { buildMtbfPayload } from "../_shared/selectors";

export const keys = ["mtbf.gearbox_reaktor", "mtbf.kompresor_utility", "mtbf.gearpump_filling"];

export function useMtbf(): { payload: MtbfPayload | null } {
  const mounted = useMounted();
  const dataset = useDataset();
  const endPeriod = useEndPeriod();
  const payload = useMemo(() => (mounted ? buildMtbfPayload(keys, dataset, { endPeriod, now: nowMs() }) : null), [mounted, dataset, endPeriod]);
  return { payload };
}
