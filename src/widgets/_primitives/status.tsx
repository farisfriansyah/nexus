import "./status.css";
import type { Status } from "@/widgets/ops-eng/schemas";

export const STATUS_LABEL: Record<Status, string> = {
  on_target: "On target",
  warning: "Warning",
  critical: "Critical",
  no_data: "Tidak ada data",
  neutral: "Info"
};

export const STATUS_COLOR: Record<Status, string> = {
  on_target: "var(--status-on-target)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  no_data: "var(--status-no-data)",
  neutral: "var(--status-neutral)"
};

/** Bentuk ikon berbeda per status agar tidak bergantung pada warna saja. */
export function StatusIcon({ status, size = "1em" }: { status: Status; size?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 16 16", "aria-hidden": true, focusable: false, className: "status-icon" } as const;
  const color = STATUS_COLOR[status];
  switch (status) {
    case "on_target":
      return <svg {...common}><circle cx="8" cy="8" r="7" fill={color} /><path d="M4.5 8.3l2.3 2.3 4.7-5" fill="none" stroke="var(--status-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "warning":
      return <svg {...common}><path d="M8 1.4l7 12.4H1z" fill={color} strokeLinejoin="round" /><path d="M8 6v3.6M8 11.6v.1" stroke="var(--status-ink)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "critical":
      return <svg {...common}><path d="M5.2 1h5.6L15 5.2v5.6L10.8 15H5.2L1 10.8V5.2z" fill={color} /><path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" stroke="var(--status-ink)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "no_data":
      return <svg {...common}><circle cx="8" cy="8" r="6.2" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2.4 2" /><path d="M5.2 8h5.6" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></svg>;
    default:
      return <svg {...common}><circle cx="8" cy="8" r="6.2" fill="none" stroke={color} strokeWidth="1.6" /><circle cx="8" cy="8" r="2" fill={color} /></svg>;
  }
}

export function StatusBadge({ status, compact = false }: { status: Status; compact?: boolean }) {
  return (
    <span className={`status-badge s-${status}`} data-status={status} role="status">
      <StatusIcon status={status} />
      {!compact && <span>{STATUS_LABEL[status]}</span>}
      {compact && <span className="sr-only">{STATUS_LABEL[status]}</span>}
    </span>
  );
}
