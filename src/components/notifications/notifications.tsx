"use client";

import "./notifications.css";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { AlertDialog, Popover } from "radix-ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { changeNotifications, useNotifications, type Notification } from "@/features/notifications/client";
import type { NotificationUpdate } from "@/features/notifications/store";
import { Button } from "@/components/ui/button";

function NotificationDetails({ item }: { item: Notification }) {
  const date = new Date(item.observedAt);
  return <div className="notification-info">
    <div className="notification-info-heading"><strong>{item.label}</strong>{!item.isRead && <span className="notification-unread-dot" aria-hidden="true" />}</div>
    <span className="notification-meta">Travo {item.unit ?? "–"} <span aria-hidden="true">·</span> {item.value === null ? "Nilai tidak tersedia" : `${item.value} ${item.unitLabel}`}</span>
    <time className="notification-time" dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{Number.isNaN(date.getTime()) ? "Waktu tidak diketahui" : date.toLocaleString("id-ID")}</time>
    <span className="notification-statuses"><span className={`notification-status ${item.isRead ? "" : "is-unread"}`}>{item.isRead ? "Sudah dibaca" : "Belum dibaca"}</span><span className={`notification-status ${item.isResolved ? "is-resolved" : "is-unresolved"}`}>{item.isResolved ? "Teratasi" : "Belum teratasi"}</span></span>
  </div>;
}

export function NotificationsButton() {
  const { data, isPending, isError, refetch } = useNotifications();
  return <Popover.Root>
    <Popover.Trigger asChild>
      <button type="button" className="notification-trigger" aria-label={`Notifikasi${data?.unread ? `, ${data.unread} belum dibaca` : ""}`} title="Notifikasi">
        <Bell size={18} />
        {Boolean(data?.unread) && <span className="notification-count">{data!.unread > 99 ? "99+" : data!.unread}</span>}
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="notification-popover" align="end" sideOffset={8} collisionPadding={12} aria-label="Notifikasi alert">
        <div className="notification-popover-head"><div><h2>Notifikasi</h2><p>{data ? `${data.unread} belum dibaca` : "Pantau alert Travo"}</p></div><Bell size={20} aria-hidden="true" /></div>
        <div className="notification-popover-body">
          {isPending && <p className="notification-empty" role="status">Memuat notifikasi…</p>}
          {isError && <div className="notification-message is-error" role="alert">Gagal memperbarui notifikasi. <button type="button" onClick={() => void refetch()}>Coba lagi</button></div>}
          {data && <>
            <section aria-labelledby="notification-active-heading">
              <div className="notification-section-heading"><h3 id="notification-active-heading">Indikator merah saat ini</h3><span>{data.active.length}</span></div>
              <p className="notification-hint">Berdasarkan pembacaan 30 detik terakhir.</p>
              {!data.active.length && <div className="notification-empty"><BellOff size={18} aria-hidden="true" /><span>Tidak ada pembacaan merah terbaru. Sensor mungkin tidak mengirim data.</span></div>}
              {data.active.map((item) => <div className="notification-active" key={`${item.unit}:${item.key}`}>
                <AlertTriangle size={18} aria-hidden="true" /><div className="notification-info"><strong>{item.label}</strong><span>Travo {item.unit} · Bahaya</span></div>
              </div>)}
            </section>
            <section aria-labelledby="notification-recent-heading">
              <div className="notification-section-heading"><h3 id="notification-recent-heading">Alert terbaru</h3></div>
              {!data.items.length && <p className="notification-empty">Belum ada riwayat alert.</p>}
              {data.items.slice(0, 5).map((item) => <div className="notification-item" key={item.id}><NotificationDetails item={item} /></div>)}
            </section>
          </>}
        </div>
        <Popover.Close asChild><Link className="notification-show-all" href="/analytics/notifications">Lihat semua <ArrowRight size={16} aria-hidden="true" /></Link></Popover.Close>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}

export function NotificationsPage() {
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [selected, setSelected] = useState<number[]>([]);
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [confirm, setConfirm] = useState<{ field: NotificationUpdate["field"]; value: boolean; label: string } | null>(null);
  const query = useNotifications(cursors[cursors.length - 1]);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: changeNotifications,
    onSuccess: async () => {
      setSelected([]);
      await client.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
  const items = query.data?.items ?? [];
  function update(field: NotificationUpdate["field"], value: boolean, label: string) {
    if (scope === "all") setConfirm({ field, value, label });
    else mutation.mutate({ selection: selected, field, value });
  }
  return <main className="notifications-page">
    <header className="notifications-page-head"><div><span className="notification-eyebrow">PEMANTAUAN TRAVO</span><h1>Semua notifikasi alert</h1><p>Riwayat indikator yang pernah mencapai level bahaya.</p></div>{query.data && <span className="notification-unread-summary"><Bell size={16} aria-hidden="true" /> {query.data.unread} belum dibaca</span>}</header>
    <div className="notification-explainer"><CheckCircle2 size={19} aria-hidden="true" /><p>Status dibaca dan teratasi berlaku untuk semua pengguna. <strong>Teratasi ditandai manual</strong> dan tidak mengubah atau memastikan kondisi sensor.</p></div>
    <section className="notification-panel" aria-label="Riwayat alert">
    <div className="notification-toolbar">
      <div className="notification-toolbar-head"><div><h2>Riwayat alert</h2><p>{scope === "all" ? "Tindakan berlaku untuk semua halaman" : `${selected.length} alert dipilih pada halaman ini`}</p></div>
        <label>Cakupan <select value={scope} onChange={(event) => { setScope(event.target.value === "all" ? "all" : "selected"); mutation.reset(); }}>
          <option value="selected">Alert yang dipilih</option><option value="all">Semua alert, termasuk halaman lain</option>
        </select></label>
      </div>
      <div className="notification-actions">
        {([["isRead", true, "Tandai sudah dibaca"], ["isRead", false, "Tandai belum dibaca"], ["isResolved", true, "Tandai teratasi"], ["isResolved", false, "Tandai belum teratasi"]] as const).map(([field, value, label]) =>
          <Button type="button" variant="outline" size="sm" key={label} disabled={mutation.isPending || (scope === "selected" && !selected.length)} onClick={() => update(field, value, label)}>{label}</Button>)}
      </div>
    </div>
    {mutation.isError && <p className="notification-message is-error" role="alert">{mutation.error.message}</p>}
    {mutation.isPending && <p className="notification-message" role="status">Memperbarui notifikasi…</p>}
    {mutation.isSuccess && <p className="notification-message is-success" role="status">Status notifikasi diperbarui.</p>}
    {query.isPending && <p className="notification-empty" role="status">Memuat notifikasi…</p>}
    {query.isError && <p className="notification-message is-error" role="alert">Gagal memperbarui notifikasi. <button type="button" onClick={() => void query.refetch()}>Coba lagi</button></p>}
    {query.data && !items.length && <p className="notification-empty">Belum ada alert pada halaman ini.</p>}
    {items.length > 0 && <>
      <label className="notification-select-all"><input type="checkbox" ref={(input) => { if (input) input.indeterminate = selected.length > 0 && selected.length < items.length; }} checked={items.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /> Pilih semua di halaman ini</label>
      <div className="notification-list">{items.map((item) => <label className={`notification-item ${item.isRead ? "" : "is-unread"}`} key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} aria-label={`Pilih ${item.label}`} />
        <NotificationDetails item={item} />
      </label>)}</div>
    </>}
    <div className="notification-pagination">
      <Button variant="outline" size="sm" disabled={cursors.length === 1} onClick={() => { setSelected([]); setCursors((current) => current.slice(0, -1)); }}>Sebelumnya</Button>
      <span>Halaman {cursors.length}</span>
      <Button variant="outline" size="sm" disabled={!query.data?.nextCursor} onClick={() => { if (query.data?.nextCursor) { setSelected([]); setCursors((current) => [...current, query.data!.nextCursor!]); } }}>Berikutnya</Button>
    </div>
    </section>
    <AlertDialog.Root open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
      <AlertDialog.Portal><AlertDialog.Overlay className="dialog-overlay" /><AlertDialog.Content className="settings-dialog notification-confirm">
        <AlertDialog.Title>Perbarui semua alert?</AlertDialog.Title>
        <AlertDialog.Description>Tindakan “{confirm?.label}” berlaku pada seluruh riwayat, termasuk halaman lain, untuk semua pengguna.</AlertDialog.Description>
        <div className="notification-confirm-actions"><AlertDialog.Cancel asChild><Button variant="outline">Batal</Button></AlertDialog.Cancel>
          <AlertDialog.Action asChild><Button onClick={() => { if (confirm) mutation.mutate({ selection: "all", field: confirm.field, value: confirm.value }); }}>Ya, perbarui semua</Button></AlertDialog.Action></div>
      </AlertDialog.Content></AlertDialog.Portal>
    </AlertDialog.Root>
  </main>;
}
