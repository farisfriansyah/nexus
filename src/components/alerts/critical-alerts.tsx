"use client";

import "./critical-alerts.css";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { StatusIcon } from "@/widgets/_primitives/status";
import { useTravoLiveGroup, TRAVO_ALERT_KEYS } from "@/features/travo/live";
import { buildCriticalTravoIndicatorAlerts } from "@/widgets/ops-eng/_shared/selectors";

interface CriticalAlert { id: string; label: string; valueText?: string; pic: string; group: string; at: string }

const MAX_VISIBLE = 3;
const timeLabel = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");

/**
 * Notifikasi saat indikator dari data Travo aktual berstatus Critical.
 * Alert hanya hilang lewat tombol tutup. Indikator yang sama baru memicu alert lagi
 * setelah keluar dari Critical, lalu kembali Critical.
 */
export function CriticalAlerts() {
  const travo1 = useTravoLiveGroup(TRAVO_ALERT_KEYS, 1);
  const travo2 = useTravoLiveGroup(TRAVO_ALERT_KEYS, 2);
  const travo3 = useTravoLiveGroup(TRAVO_ALERT_KEYS, 3);
  const travo4 = useTravoLiveGroup(TRAVO_ALERT_KEYS, 4);
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const known = useRef(new Set<string>());

  useEffect(() => {
    const critical = [
      ...buildCriticalTravoIndicatorAlerts(1, travo1.live.readings, travo1.live.statuses),
      ...buildCriticalTravoIndicatorAlerts(2, travo2.live.readings, travo2.live.statuses),
      ...buildCriticalTravoIndicatorAlerts(3, travo3.live.readings, travo3.live.statuses),
      ...buildCriticalTravoIndicatorAlerts(4, travo4.live.readings, travo4.live.statuses)
    ];
    const criticalIds = new Set(critical.map((unit) => unit.id));
    for (const id of known.current) if (!criticalIds.has(id)) known.current.delete(id);
    const fresh = critical.filter((unit) => !known.current.has(unit.id));
    if (!fresh.length) return;
    fresh.forEach((unit) => known.current.add(unit.id));
    const at = timeLabel();
    setAlerts((current) => [
      ...current.filter((alert) => !fresh.some((unit) => unit.id === alert.id)),
      ...fresh.map((unit) => ({ id: unit.id, label: unit.label, valueText: unit.valueText, pic: unit.pic, group: unit.group, at }))
    ]);
  }, [travo1.live, travo2.live, travo3.live, travo4.live]);

  if (!alerts.length) return null;
  const visible = alerts.slice(0, MAX_VISIBLE);
  const hidden = alerts.length - visible.length;
  const close = (id: string) => setAlerts((current) => current.filter((alert) => alert.id !== id));

  return (
    <div className="ca-stack" aria-live="assertive">
      {visible.map((alert) => (
        <div key={alert.id} className="ca-item" role="alert" data-alert-id={alert.id}>
          <StatusIcon status="critical" size="1.5em" />
          <div className="ca-body">
            <strong>{alert.label}</strong>
            <span>Bahaya{alert.valueText ? ` · ${alert.valueText}` : ""}</span>
            <small>{alert.group} · PIC {alert.pic} · {alert.at}</small>
          </div>
          <button type="button" className="ca-close" onClick={() => close(alert.id)} aria-label={`Tutup alert ${alert.label}`}><X size={16} /></button>
        </div>
      ))}
      {(hidden > 0 || alerts.length > 1) && (
        <div className="ca-footer">
          {hidden > 0 && <span>+{hidden} alert lainnya</span>}
          <button type="button" onClick={() => setAlerts([])}>Tutup semua</button>
        </div>
      )}
      <Link className="ca-history" href="/analytics/notifications">Lihat riwayat notifikasi</Link>
    </div>
  );
}
