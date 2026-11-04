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
    const refresh = () => {
      void refreshIndicatorThresholds().catch((error: unknown) => {
        if (active) console.error("[indicator-thresholds] Gagal memuat konfigurasi ambang", error);
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  return children;
}
