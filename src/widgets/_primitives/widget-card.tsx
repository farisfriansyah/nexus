"use client";

import "./widget-card.css";

import { createContext, useContext, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { DashboardMode } from "@/features/widgets-registry/types";
import type { Status } from "@/widgets/ops-eng/schemas";
import { StatusBadge, StatusIcon } from "./status";

export type ForcedState = "loading" | "error" | null;
export const ForcedStateContext = createContext<ForcedState>(null);

export function relativeAge(updatedAt: string | number | null | undefined, now: number): string {
  if (updatedAt === null || updatedAt === undefined) return "–";
  const ms = now - new Date(updatedAt).getTime();
  if (!Number.isFinite(ms)) return "–";
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
}

export interface WidgetCardProps {
  mode: DashboardMode;
  title: string;
  subtitle?: string;
  status?: Status;
  /** Ditampilkan sebagai badge di header bila diberikan. */
  showBadge?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  stale?: boolean;
  updatedLabel?: string;
  /** Sumber data untuk footer, mis. "Plant Vision". */
  source?: string;
  /** Ringkasan untuk pembaca layar, mis. "MA1 32,5 °C, Normal". */
  summary?: string;
  /** Chip PIC, hanya tampil di mode analitik. */
  pic?: string;
  widgetId: string;
  children: ReactNode;
}

export function WidgetCard({ mode, title, subtitle, status, showBadge = false, loading, error, onRetry, stale, updatedLabel, source, summary, pic, widgetId, children }: WidgetCardProps) {
  const forced = useContext(ForcedStateContext);
  const isLoading = forced === "loading" || loading;
  const errorMessage = forced === "error" ? "Gagal memuat data" : error;
  const dummy = process.env.NODE_ENV !== "production";

  return (
    <section className={`wx wx-${mode} ${status ? `wx-s-${status}` : ""}`} data-widget={widgetId} data-status={status} data-state={isLoading ? "loading" : errorMessage ? "error" : "ready"} aria-label={summary ? `${title}: ${summary}` : title}>
      <header className="wx-head">
        <div className="wx-titles">
          <h3 className="wx-title">{title}</h3>
          {subtitle && <span className="wx-sub">{subtitle}</span>}
        </div>
        <div className="wx-chips">
          {dummy && <span className="wx-chip wx-dummy" title="Data simulasi">DUMMY</span>}
          {mode === "analytic" && pic && <span className="wx-chip wx-pic" title="Penanggung jawab">PIC {pic}</span>}
          {stale && <span className="wx-chip wx-stale" title="Data tidak diperbarui sesuai jadwal">Data usang</span>}
          {showBadge && status && <StatusBadge status={status} />}
        </div>
      </header>
      <div className="wx-body">
        {isLoading ? (
          <div className="wx-skeleton" aria-busy="true"><span /><span /><span /></div>
        ) : errorMessage ? (
          <div className="wx-error" role="alert">
            <StatusIcon status="critical" size="1.4em" />
            <span>{errorMessage}</span>
            {onRetry && <button type="button" className="wx-retry" onClick={onRetry}><RefreshCw size={12} /> Coba lagi</button>}
          </div>
        ) : children}
      </div>
      {updatedLabel && !isLoading && !errorMessage && <footer className="wx-foot">{source ? `${source} \u2022 ` : "Diperbarui "}{updatedLabel}</footer>}
    </section>
  );
}
