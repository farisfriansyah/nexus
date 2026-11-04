"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyIndicatorThresholds } from "@/features/indicator-thresholds/runtime";
import { validateIndicatorBands } from "@/features/indicator-thresholds/schema";
import type { BandDef } from "@/widgets/ops-eng/schemas";

type EditableBand = { status: BandDef["status"]; min: string; max: string; minInclusive: boolean; maxInclusive: boolean };
type IndicatorRecord = { key: string; bands: EditableBand[]; name: string; unit: string; decimals: number };
export type ApiIndicatorRecord = Omit<IndicatorRecord, "bands"> & { bands: BandDef[] };
type Notice = { kind: "ok" | "error"; text: string } | null;
const statusNames: Record<BandDef["status"], string> = { on_target: "Normal", warning: "Peringatan", critical: "Bahaya" };

function toEditable(bands: BandDef[]): EditableBand[] {
  return [...bands].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity)).map((band) => ({
    status: band.status,
    min: band.min === null ? "" : String(band.min),
    max: band.max === null ? "" : String(band.max),
    minInclusive: band.minInclusive,
    maxInclusive: band.maxInclusive
  }));
}

function toBands(bands: EditableBand[]): BandDef[] | null {
  const parsed: BandDef[] = [];
  for (const band of bands) {
    const min = band.min.trim() === "" ? null : Number(band.min);
    const max = band.max.trim() === "" ? null : Number(band.max);
    if ((min !== null && !Number.isFinite(min)) || (max !== null && !Number.isFinite(max))) return null;
    parsed.push({ status: band.status, min, max, minInclusive: band.minInclusive, maxInclusive: band.maxInclusive });
  }
  return parsed;
}

export function IndicatorThresholdEditor({ initialRecords }: { initialRecords: ApiIndicatorRecord[] }) {
  const [records, setRecords] = useState<IndicatorRecord[]>(() => initialRecords.map((entry) => ({ ...entry, bands: toEditable(entry.bands) })));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  function changeBand(key: string, index: number, patch: Partial<EditableBand>) {
    setRecords((current) => current.map((record) => record.key !== key ? record : {
      ...record,
      bands: record.bands.map((band, bandIndex) => bandIndex === index ? { ...band, ...patch } : band)
    }));
  }

  function addBand(record: IndicatorRecord) {
    const bands = record.bands;
    if (!bands.length) {
      setRecords((current) => current.map((entry) => entry.key === record.key
        ? { ...entry, bands: [{ status: "on_target", min: "", max: "", minInclusive: false, maxInclusive: false }] }
        : entry));
      return;
    }
    const lastIndex = bands.length - 1;
    const last = bands[lastIndex]!;
    const lower = last.min === "" ? null : Number(last.min);
    const upper = lower === null ? 0 : lower + Math.max(1, Math.abs(lower) * 0.1);
    const next = [...bands];
    next[lastIndex] = { ...last, min: String(upper), minInclusive: true };
    next.splice(lastIndex, 0, {
      status: "warning",
      min: last.min,
      max: String(upper),
      minInclusive: last.minInclusive,
      maxInclusive: false
    });
    setRecords((current) => current.map((entry) => entry.key === record.key ? { ...entry, bands: next } : entry));
  }

  function removeBand(record: IndicatorRecord, index: number) {
    const bands = record.bands;
    const next = [...bands];
    if (next.length === 1) {
      next.splice(index, 1);
    } else if (index === 0) {
      next.splice(index, 1);
      next[0] = { ...next[0]!, min: "", minInclusive: false };
    } else if (index === next.length - 1) {
      next.splice(index, 1);
      next[next.length - 1] = { ...next.at(-1)!, max: "", maxInclusive: false };
    } else {
      const removed = next[index]!;
      next[index - 1] = { ...next[index - 1]!, max: removed.max, maxInclusive: removed.maxInclusive };
      next.splice(index, 1);
    }
    setRecords((current) => current.map((entry) => entry.key === record.key ? { ...entry, bands: next } : entry));
  }

  async function save(record: IndicatorRecord) {
    const bands = toBands(record.bands);
    if (!bands) {
      setNotice({ kind: "error", text: "Masukkan batas angka yang valid." });
      return;
    }
    const checked = validateIndicatorBands(bands);
    if (!checked.ok) {
      setNotice({ kind: "error", text: checked.error });
      return;
    }
    setSavingKey(record.key);
    setNotice(null);
    try {
      const response = await fetch("/api/indicator-thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: record.key, bands: checked.bands })
      });
      const saved = await response.json() as ApiIndicatorRecord & { error?: string };
      if (!response.ok) throw new Error(saved.error ?? "Gagal menyimpan ambang indikator");
      setRecords((current) => current.map((entry) => entry.key === record.key ? { ...entry, bands: toEditable(saved.bands) } : entry));
      applyIndicatorThresholds([{ key: saved.key, bands: saved.bands }]);
      setNotice({ kind: "ok", text: `Ambang ${saved.name} tersimpan.` });
    } catch (saveError) {
      setNotice({ kind: "error", text: saveError instanceof Error ? saveError.message : "Gagal menyimpan ambang indikator" });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="threshold-editor">
      {notice && <p className={`le-notice is-${notice.kind}`} role="status">{notice.text}</p>}
      {records.map((record) => {
        const bands = record.bands;
        return (
          <section className="threshold-metric" key={record.key}>
            <header><h3>{record.name}</h3><span>{record.unit || "Tanpa satuan"}</span></header>
            {bands.length === 0 && <p className="muted">Ambang nonaktif. Indikator ini belum menghasilkan status normal/peringatan/bahaya.</p>}
            {bands.map((band, index) => (
              <div className="threshold-band" key={`${record.key}-${index}`}>
                <label>Status
                  <select value={band.status} onChange={(event) => changeBand(record.key, index, { status: event.target.value as BandDef["status"] })}>
                    {Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Minimum
                  <input aria-label={`${record.name} rentang ${index + 1} minimum`} type="number" step="any" value={band.min} placeholder="−∞" onChange={(event) => changeBand(record.key, index, { min: event.target.value })} />
                </label>
                <label>Maksimum
                  <input aria-label={`${record.name} rentang ${index + 1} maksimum`} type="number" step="any" value={band.max} placeholder="+∞" onChange={(event) => changeBand(record.key, index, { max: event.target.value })} />
                </label>
                <label className="threshold-inclusive"><input type="checkbox" checked={band.minInclusive} disabled={band.min === ""} onChange={(event) => changeBand(record.key, index, { minInclusive: event.target.checked })} /> Termasuk min</label>
                <label className="threshold-inclusive"><input type="checkbox" checked={band.maxInclusive} disabled={band.max === ""} onChange={(event) => changeBand(record.key, index, { maxInclusive: event.target.checked })} /> Termasuk maks</label>
                <Button type="button" variant="ghost" size="icon" aria-label={`Hapus rentang ${index + 1} untuk ${record.name}`} onClick={() => removeBand(record, index)}><Trash2 size={15} /></Button>
              </div>
            ))}
            <div className="threshold-actions">
              <Button type="button" variant="outline" size="sm" onClick={() => addBand(record)}><Plus size={14} /> Tambah rentang</Button>
              <Button type="button" size="sm" disabled={savingKey !== null} onClick={() => void save(record)}><Save size={14} /> {savingKey === record.key ? "Menyimpan…" : "Simpan ambang"}</Button>
            </div>
          </section>
        );
      })}
      {records.length === 0 && <p className="muted">Widget ini tidak memiliki indikator ambang.</p>}
    </div>
  );
}
