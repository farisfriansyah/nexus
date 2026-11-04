"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tabs } from "@/config/tabs";
import type { TvLayoutProfileSummary } from "@/features/layout/store";
import "./layout-editor.css";

type Notice = { kind: "ok" | "error"; text: string } | null;

export function TvLayoutProfiles({ initialProfiles, loadError }: { initialProfiles: TvLayoutProfileSummary[]; loadError: boolean }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function request(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({})) as { error?: string; id?: number; name?: string };
    if (!response.ok) throw new Error(result.error ?? `Gagal (${response.status})`);
    return result;
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const created = await request("/api/tv-layout-profiles", "POST", { name });
      setProfiles((current) => [...current, { id: created.id!, name: created.name! }].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setNotice({ kind: "ok", text: "Preset berhasil dibuat dari layout TV yang sedang diterbitkan." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal membuat preset" });
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: number) {
    setBusy(true);
    setNotice(null);
    try {
      const updated = await request(`/api/tv-layout-profiles/${id}`, "PATCH", { name: editName });
      setProfiles((current) => current.map((profile) => profile.id === id ? { id, name: updated.name! } : profile).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
      setNotice({ kind: "ok", text: "Nama preset diperbarui." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal mengganti nama preset" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(profile: TvLayoutProfileSummary) {
    if (!window.confirm(`Hapus preset "${profile.name}"? Pilihan perangkat TV yang memakai preset ini akan kembali ke layout default.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await request(`/api/tv-layout-profiles/${profile.id}`, "DELETE");
      setProfiles((current) => current.filter((entry) => entry.id !== profile.id));
      setNotice({ kind: "ok", text: `Preset "${profile.name}" dihapus.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal menghapus preset" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="le lp-page">
      <header className="le-bar">
        <div>
          <h1>Preset Layout TV</h1>
          <p>Kelola layout bersama. Setiap perangkat TV dapat memilih preset masing-masing.</p>
        </div>
        <Link className="le-link" href="/tv/plant-kpi">← Kembali ke TV</Link>
      </header>
      {notice && <p className={`le-notice is-${notice.kind}`} role="status">{notice.text}</p>}
      {loadError && <p className="le-notice is-error" role="alert">Daftar preset tidak dapat dimuat. Periksa koneksi database lalu muat ulang halaman.</p>}
      <form className="lp-create" onSubmit={(event) => void create(event)}>
        <label htmlFor="profile-name">Nama preset</label>
        <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Contoh: Kantor atau Plant" />
        <Button type="submit" disabled={busy || !name.trim()}><Plus size={15} /> Buat preset</Button>
      </form>
      {profiles.length === 0
        ? <p className="lp-empty">Belum ada preset layout. Preset baru akan dimulai dari layout TV yang sedang diterbitkan.</p>
        : <div className="lp-list">
          {profiles.map((profile) => (
            <section key={profile.id} className="lp-card">
              <header className="lp-card-head">
                {editingId === profile.id
                  ? <form className="lp-rename" onSubmit={(event) => { event.preventDefault(); void rename(profile.id); }}>
                    <input aria-label="Nama preset baru" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={100} required autoFocus />
                    <Button size="sm" type="submit" disabled={busy || !editName.trim()}><Save size={14} /> Simpan</Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setEditingId(null)} disabled={busy}><X size={14} /> Batal</Button>
                  </form>
                  : <>
                    <h2>{profile.name}</h2>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(profile.id); setEditName(profile.name); }} disabled={busy}><Pencil size={14} /> Ganti nama</Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(profile)} disabled={busy}><Trash2 size={14} /> Hapus</Button>
                  </>}
              </header>
              <nav className="lp-tabs" aria-label={`Edit tab preset ${profile.name}`}>
                {tabs.map((tab) => <Link key={tab.slug} href={`/tv/layout/${tab.slug}?profileId=${profile.id}`}>Edit {tab.label}</Link>)}
              </nav>
            </section>
          ))}
        </div>}
    </main>
  );
}
