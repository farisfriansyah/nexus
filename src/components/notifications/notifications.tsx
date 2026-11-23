"use client";

import "./notifications.css";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Popover } from "radix-ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { changeNotifications, useNotifications, type Notification } from "@/features/notifications/client";
import type { NotificationUpdate } from "@/features/notifications/store";

function NotificationDetails({ item }: { item: Notification }) {
  const date = new Date(item.observedAt);
  return <div className="notification-info">
    <strong>{item.label}</strong>
    <span>Travo {item.unit ?? "–"} · {item.value === null ? "–" : `${item.value} ${item.unitLabel}`} · {Number.isNaN(date.getTime()) ? "Waktu tidak diketahui" : date.toLocaleString("id-ID")}</span>
    <small>{item.isRead ? "Sudah dibaca" : "Belum dibaca"} · {item.isResolved ? "Teratasi" : "Belum teratasi"}</small>
  </div>;
}

export function NotificationsButton() {
  const { data, isPending, isError } = useNotifications();
  return <Popover.Root>
    <Popover.Trigger asChild>
      <button type="button" className="notification-trigger" aria-label={`Notifikasi${data?.unread ? `, ${data.unread} belum dibaca` : ""}`} title="Notifikasi">
        <Bell size={18} />
        {Boolean(data?.unread) && <span className="notification-count">{data!.unread > 99 ? "99+" : data!.unread}</span>}
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content className="notification-popover" align="end" sideOffset={8}>
        <h2>Notifikasi alert</h2>
        {isPending && <p role="status">Memuat notifikasi…</p>}
        {isError && <p role="alert">Gagal memuat notifikasi.</p>}
        {data && <>
          <strong>Indikator merah saat ini</strong>
          {!data.active.length && <p>Tidak ada pembacaan merah terbaru.</p>}
          {data.active.map((item) => <div className="notification-item" key={`${item.unit}:${item.key}`}>
            <div className="notification-info"><strong>{item.label}</strong><span>Travo {item.unit} · Bahaya</span></div>
          </div>)}
          <strong>Alert terbaru</strong>
          {!data.items.length && <p>Belum ada riwayat alert.</p>}
          {data.items.slice(0, 5).map((item) => <div className="notification-item" key={item.id}><NotificationDetails item={item} /></div>)}
        </>}
        <Popover.Close asChild><Link className="notification-show-all" href="/analytics/notifications">Lihat semua</Link></Popover.Close>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}

export function NotificationsPage() {
  const [cursors, setCursors] = useState<(number | undefined)[]>([undefined]);
  const [selected, setSelected] = useState<number[]>([]);
  const [scope, setScope] = useState<"selected" | "all">("selected");
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
  function update(field: NotificationUpdate["field"], value: boolean) {
    mutation.mutate({ selection: scope === "all" ? "all" : selected, field, value });
  }
  return <main className="notifications-page">
    <h1>Semua notifikasi alert</h1>
    <p>Riwayat indikator Travo yang pernah mencapai level bahaya. Status teratasi ditandai manual dan tidak mengubah kondisi sensor. Status berlaku untuk semua pengguna.</p>
    <div className="notification-actions">
      <label>Cakupan <select value={scope} onChange={(event) => setScope(event.target.value === "all" ? "all" : "selected")}>
        <option value="selected">Alert yang dipilih</option><option value="all">Semua alert, termasuk halaman lain</option>
      </select></label>
      <button disabled={mutation.isPending || (scope === "selected" && !selected.length)} onClick={() => update("isRead", true)}>Tandai sudah dibaca</button>
      <button disabled={mutation.isPending || (scope === "selected" && !selected.length)} onClick={() => update("isRead", false)}>Tandai belum dibaca</button>
      <button disabled={mutation.isPending || (scope === "selected" && !selected.length)} onClick={() => update("isResolved", true)}>Tandai teratasi</button>
      <button disabled={mutation.isPending || (scope === "selected" && !selected.length)} onClick={() => update("isResolved", false)}>Tandai belum teratasi</button>
    </div>
    {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    {mutation.isSuccess && <p role="status">Status notifikasi diperbarui.</p>}
    {query.isPending && <p role="status">Memuat notifikasi…</p>}
    {query.isError && <p role="alert">Gagal memuat notifikasi. <button onClick={() => void query.refetch()}>Coba lagi</button></p>}
    {query.data && !items.length && <p>Belum ada alert pada halaman ini.</p>}
    {items.length > 0 && <>
      <label className="notification-select-all"><input type="checkbox" checked={items.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /> Pilih semua di halaman ini</label>
      <div className="notification-list">{items.map((item) => <label className="notification-item" key={item.id}>
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} aria-label={`Pilih ${item.label}`} />
        <NotificationDetails item={item} />
      </label>)}</div>
    </>}
    <div className="notification-pagination">
      <button disabled={cursors.length === 1} onClick={() => { setSelected([]); setCursors((current) => current.slice(0, -1)); }}>Sebelumnya</button>
      <span>Halaman {cursors.length}</span>
      <button disabled={!query.data?.nextCursor} onClick={() => { if (query.data?.nextCursor) { setSelected([]); setCursors((current) => [...current, query.data!.nextCursor!]); } }}>Berikutnya</button>
    </div>
  </main>;
}
