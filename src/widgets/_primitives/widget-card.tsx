"use client";

import "./widget-card.css";

import { createContext, useContext, useState, type ReactNode } from "react";
import { RefreshCw, Settings2 } from "lucide-react";
import { Dialog } from "radix-ui";
import type { DashboardMode } from "@/features/widgets-registry/types";
import type { Status } from "@/widgets/ops-eng/schemas";
import { useIsAdmin } from "@/features/preferences/preferences-provider";
import { IndicatorThresholdEditor, type ApiIndicatorRecord } from "@/components/widgets/indicator-threshold-editor";
import { Button } from "@/components/ui/button";
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
  showDummyBadge?: boolean;
  /** Ringkasan untuk pembaca layar, mis. "MA1 32,5 °C, Normal". */
  summary?: string;
  /** Chip PIC, hanya tampil di mode analitik. */
  pic?: string;
  widgetId: string;
  indicatorKeys?: string[];
  children: ReactNode;
}

export function WidgetCard({ mode, title, subtitle, status, showBadge = false, loading, error, onRetry, stale, updatedLabel, source, showDummyBadge = process.env.NODE_ENV !== "production", summary, pic, widgetId, indicatorKeys = [], children }: WidgetCardProps) {
  const forced = useContext(ForcedStateContext);
  const isAdmin = useIsAdmin();
  const [thresholdSettingsOpen, setThresholdSettingsOpen] = useState(false);
  const [thresholdRecords, setThresholdRecords] = useState<ApiIndicatorRecord[] | null>(null);
  const [thresholdLoading, setThresholdLoading] = useState(false);
  const [thresholdError, setThresholdError] = useState("");
  const [thresholdRequestId, setThresholdRequestId] = useState(0);
  const isLoading = forced === "loading" || loading;
  const errorMessage = forced === "error" ? "Gagal memuat data" : error;
  const dummy = showDummyBadge;
  async function openThresholdSettings(open: boolean) {
    setThresholdSettingsOpen(open);
    if (!open) return;
    setThresholdLoading(true);
    setThresholdError("");
    try {
      const response = await fetch("/api/indicator-thresholds", { cache: "no-store" });
      const body = await response.json() as { indicators?: ApiIndicatorRecord[]; error?: string };
      if (!response.ok || !body.indicators) throw new Error(body.error ?? "Gagal memuat ambang indikator");
      setThresholdRecords(body.indicators.filter((entry) => indicatorKeys.includes(entry.key)));
      setThresholdRequestId((current) => current + 1);
    } catch (loadError) {
      setThresholdError(loadError instanceof Error ? loadError.message : "Gagal memuat ambang indikator");
    } finally {
      setThresholdLoading(false);
    }
  }

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
          {isAdmin && indicatorKeys.length > 0 && (
            <Dialog.Root open={thresholdSettingsOpen} onOpenChange={(open) => void openThresholdSettings(open)}>
              <Dialog.Trigger asChild>
                <button type="button" className="wx-threshold-trigger" aria-label={`Atur batas indikator ${title}`} title="Atur batas indikator" onClick={(event) => event.stopPropagation()}>
                  <Settings2 size={15} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="settings-dialog threshold-dialog">
                  <div className="threshold-dialog-head">
                    <div><Dialog.Title>Pengaturan indikator</Dialog.Title><Dialog.Description className="muted">{title} · aturan global untuk semua perangkat. Rentang harus berurutan tanpa celah; batas kosong berarti tidak terbatas.</Dialog.Description></div>
                    <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup pengaturan indikator">×</Button></Dialog.Close>
                  </div>
                  {thresholdLoading && <p role="status">Memuat ambang indikator…</p>}
                  {thresholdError && <p className="le-notice is-error" role="alert">{thresholdError}</p>}
                  {!thresholdLoading && !thresholdError && thresholdRecords && <IndicatorThresholdEditor key={thresholdRequestId} initialRecords={thresholdRecords} />}
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
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
