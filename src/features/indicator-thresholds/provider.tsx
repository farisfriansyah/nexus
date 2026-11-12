"use client";

import { useEffect, type ReactNode } from "react";
import { applyIndicatorThresholds } from "./runtime";
import type { BandDef } from "@/widgets/ops-eng/schemas";

type ResponseBody = { indicators?: { key: string; bands: BandDef[] }[]; error?: string };

export async function refreshIndicatorThresholds(): Promise<void> {
  const response = await fetch("/api/indicator-thresholds", { cache: "no-store" });
  const body = await response.json().catch(() => null) as ResponseBody | null;
  if (!response.ok || !body?.indicators) throw new Error(body?.error ?? `Gagal memuat ambang indikator (${response.status})`);
  applyIndicatorThresholds(body.indicators);
}

export function IndicatorThresholdProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let failures = 0;

    const refresh = async () => {
      try {
        await refreshIndicatorThresholds();
        failures = 0;
      } catch (error: unknown) {
        if (!active) return;
        if (failures === 0) console.error("[indicator-thresholds] Gagal memuat konfigurasi ambang", error);
        failures += 1;
      }

      if (active) {
        const delay = failures === 0 ? 60_000 : Math.min(60_000 * 2 ** (failures - 1), 5 * 60_000);
        timer = window.setTimeout(() => void refresh(), delay);
      }
    };
    void refresh();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);
  return children;
}
