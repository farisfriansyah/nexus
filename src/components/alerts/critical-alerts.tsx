"use client";

import "./critical-alerts.css";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { StatusIcon } from "@/widgets/_primitives/status";
import { useUnits } from "@/widgets/ops-eng/_shared/hooks";

interface CriticalAlert { id: string; label: string; valueText?: string; pic: string; group: string; at: string }

const MAX_VISIBLE = 3;
const timeLabel = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");

/**
 * Notifikasi di kanan bawah saat sebuah indikator berstatus Critical.
 * Alert hanya hilang lewat tombol tutup. Indikator yang sama baru memicu alert lagi
 * setelah keluar dari Critical, lalu kembali Critical.
 */
export function CriticalAlerts() {
  const { ready, units } = useUnits();
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const known = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) return;
    const critical = units.filter((unit) => unit.status === "critical");
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
  }, [ready, units]);

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
            <span>Critical{alert.valueText ? ` · ${alert.valueText}` : ""}</span>
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
    </div>
  );
}
