"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowLeft, ArrowRight, GripVertical, Minus, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWidget, widgetsForTab } from "@/features/widgets-registry/registry";
import { packSlide } from "@/features/layout/resolver";
import { MAX_ROWS, WIDTH_PRESETS, type LayoutItem, type Slide, type TabLayout } from "@/features/layout/schema";
import "./layout-editor.css";

type Source = "default" | "published" | "draft";
type Notice = { kind: "ok" | "error"; text: string } | null;

const SOURCE_LABEL: Record<Source, string> = { default: "Bawaan", published: "Terbit", draft: "Draft belum diterapkan" };

function CanvasItem({ item, position, index, last, onChange, onMove, onRemove }: {
  item: LayoutItem; position: { x: number; y: number }; index: number; last: boolean;
  onChange: (patch: Partial<LayoutItem>) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.widgetId });
  const widget = getWidget(item.widgetId);
  return (
    <div
      ref={setNodeRef}
      className={`le-item ${isDragging ? "is-dragging" : ""} ${widget ? "" : "is-missing"}`}
      style={{ gridColumn: `${position.x + 1} / span ${item.w}`, gridRow: `${position.y + 1} / span ${item.h}`, transform: CSS.Translate.toString(transform), transition }}
      data-widget-id={item.widgetId}
    >
      <div className="le-item-head">
        <button type="button" className="le-grip" aria-label={`Geser ${widget?.title ?? item.widgetId}`} {...attributes} {...listeners}><GripVertical size={14} /></button>
        <strong title={widget?.title}>{widget?.title ?? item.widgetId}</strong>
        <button type="button" className="le-icon" aria-label="Hapus dari slide" onClick={onRemove}><Trash2 size={13} /></button>
      </div>
      <div className="le-item-tools">
        <div className="le-chips" role="group" aria-label="Lebar">
          {WIDTH_PRESETS.map((preset) => (
            <button key={preset.w} type="button" className={`le-chip ${item.w === preset.w ? "on" : ""}`} aria-pressed={item.w === preset.w} onClick={() => onChange({ w: preset.w })}>{preset.label}</button>
          ))}
        </div>
        <div className="le-stepper" role="group" aria-label="Tinggi (baris)">
          <button type="button" aria-label="Kurangi tinggi" disabled={item.h <= 1} onClick={() => onChange({ h: item.h - 1 })}><Minus size={12} /></button>
          <span>{item.h} baris</span>
          <button type="button" aria-label="Tambah tinggi" onClick={() => onChange({ h: item.h + 1 })}><Plus size={12} /></button>
        </div>
        <div className="le-order">
          <button type="button" aria-label="Pindah lebih awal" disabled={index === 0} onClick={() => onMove(-1)}><ArrowLeft size={12} /></button>
          <button type="button" aria-label="Pindah lebih akhir" disabled={last} onClick={() => onMove(1)}><ArrowRight size={12} /></button>
        </div>
      </div>
    </div>
  );
}

export function LayoutEditor({ tab, tabLabel, initial }: { tab: string; tabLabel: string; initial: { layout: TabLayout; source: Source; version: number | null } }) {
  const [layout, setLayout] = useState<TabLayout>(initial.layout);
  const [history, setHistory] = useState<TabLayout[]>([]);
  const [source, setSource] = useState<Source>(initial.source);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [index, setIndex] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const slide = layout.slides[Math.min(index, layout.slides.length - 1)]!;
  const slideIndex = layout.slides.indexOf(slide);
  const pack = useMemo(() => packSlide(slide.items, slide.rows), [slide]);
  const tabWidgets = useMemo(() => widgetsForTab(tab), [tab]);
  const usedHere = new Set(slide.items.map((item) => item.widgetId));
  const usedAnywhere = new Set(layout.slides.flatMap((entry) => entry.items.map((item) => item.widgetId)));
  const overflowSlides = layout.slides.filter((entry) => packSlide(entry.items, entry.rows).overflow.length > 0);
  const fill = Math.round((pack.usedCells / pack.totalCells) * 100);
  const canSave = overflowSlides.length === 0 && !busy;

  function commit(next: TabLayout) {
    setHistory((past) => [...past.slice(-30), layout]);
    setLayout(next);
    setDirty(true);
    setNotice(null);
  }
  function updateSlide(patch: (current: Slide) => Slide) {
    commit({ ...layout, slides: layout.slides.map((entry, i) => (i === slideIndex ? patch(entry) : entry)) });
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((past) => past.slice(0, -1));
    setLayout(previous);
    setDirty(true);
  }
  function addSlide() {
    commit({ ...layout, slides: [...layout.slides, { id: `slide-${Date.now().toString(36)}`, title: `Slide ${layout.slides.length + 1}`, rows: 2, items: [] }] });
    setIndex(layout.slides.length);
  }
  function removeSlide() {
    if (layout.slides.length < 2) return;
    commit({ ...layout, slides: layout.slides.filter((_, i) => i !== slideIndex) });
    setIndex(Math.max(0, slideIndex - 1));
  }
  function moveSlide(direction: -1 | 1) {
    const target = slideIndex + direction;
    if (target < 0 || target >= layout.slides.length) return;
    commit({ ...layout, slides: arrayMove(layout.slides, slideIndex, target) });
    setIndex(target);
  }
  function setRows(rows: number) {
    const clamped = Math.min(MAX_ROWS, Math.max(1, rows));
    updateSlide((current) => ({ ...current, rows: clamped, items: current.items.map((item) => ({ ...item, h: Math.min(item.h, clamped) })) }));
  }
  function patchItem(widgetId: string, patch: Partial<LayoutItem>) {
    updateSlide((current) => ({ ...current, items: current.items.map((item) => (item.widgetId === widgetId ? { ...item, ...patch, h: Math.min(patch.h ?? item.h, current.rows) } : item)) }));
  }
  function moveItem(from: number, to: number) {
    if (to < 0 || to >= slide.items.length) return;
    updateSlide((current) => ({ ...current, items: arrayMove(current.items, from, to) }));
  }
  function removeItem(widgetId: string) {
    updateSlide((current) => ({ ...current, items: current.items.filter((entry) => entry.widgetId !== widgetId) }));
  }
  function addWidget(widgetId: string) {
    updateSlide((current) => ({ ...current, items: [...current.items, { widgetId, w: 6, h: 1 }] }));
  }
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = slide.items.findIndex((item) => item.widgetId === active.id);
    const to = slide.items.findIndex((item) => item.widgetId === over.id);
    if (from >= 0 && to >= 0) moveItem(from, to);
  }

  async function request(method: string, url: string, body?: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(json.error ?? `Gagal (${response.status})`);
    return json;
  }
  async function save(publish: boolean) {
    setBusy(true);
    try {
      await request("PUT", `/api/layout/${tab}`, layout);
      if (publish) await request("POST", `/api/layout/${tab}/publish`);
      setSource(publish ? "published" : "draft");
      setDirty(false);
      setNotice({ kind: "ok", text: publish ? "Layout diterapkan. TV akan memuat ulang otomatis." : "Draft tersimpan." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal menyimpan" });
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!window.confirm("Kembalikan layout tab ini ke bawaan? Semua versi tersimpan akan dihapus.")) return;
    setBusy(true);
    try {
      await request("DELETE", `/api/layout/${tab}`);
      const response = await fetch(`/api/layout/${tab}`, { cache: "no-store" });
      const json = (await response.json()) as { layout: TabLayout };
      setLayout(json.layout);
      setHistory([]);
      setSource("default");
      setDirty(false);
      setIndex(0);
      setNotice({ kind: "ok", text: "Layout dikembalikan ke bawaan." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal reset" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="le" data-testid="layout-editor">
      <header className="le-bar">
        <div>
          <h1>Atur Layout · {tabLabel}</h1>
          <p>Susun slide, urutan, dan ukuran widget. Ruang kosong otomatis diisi widget berikutnya.</p>
        </div>
        <span className={`le-badge is-${dirty ? "dirty" : source}`}>{dirty ? "Perubahan belum disimpan" : SOURCE_LABEL[source]}</span>
        <Button variant="ghost" size="sm" onClick={undo} disabled={history.length === 0}><Undo2 size={14} /> Urungkan</Button>
        <Button variant="ghost" size="sm" onClick={() => void reset()} disabled={busy || source === "default"}>Reset ke bawaan</Button>
        <Button variant="outline" size="sm" onClick={() => void save(false)} disabled={!canSave || !dirty}>Simpan draft</Button>
        <Button size="sm" onClick={() => void save(true)} disabled={!canSave || (!dirty && source !== "draft")}>Terapkan ke TV</Button>
        <Link className="le-link" href={`/tv/${tab}`}>← Kembali ke TV</Link>
      </header>
      {notice && <p className={`le-notice is-${notice.kind}`} role="status">{notice.text}</p>}
      {overflowSlides.length > 0 && (
        <p className="le-notice is-error" role="alert"><AlertTriangle size={14} /> Tidak muat di: {overflowSlides.map((entry) => entry.title).join(", ")}. Perkecil widget atau tambah baris sebelum menyimpan.</p>
      )}

      <div className="le-body">
        <nav className="le-slides" aria-label="Daftar slide">
          {layout.slides.map((entry, i) => {
            const bad = packSlide(entry.items, entry.rows).overflow.length > 0;
            return (
              <button key={entry.id} type="button" className={`le-slide-tab ${i === slideIndex ? "on" : ""} ${bad ? "bad" : ""}`} onClick={() => setIndex(i)} aria-current={i === slideIndex ? "true" : undefined}>
                <span className="le-slide-no">{i + 1}</span>
                <span className="le-slide-name">{entry.title}</span>
                <small>{entry.items.length} widget</small>
              </button>
            );
          })}
          <Button variant="outline" size="sm" onClick={addSlide}><Plus size={14} /> Slide baru</Button>
        </nav>

        <section className="le-main" aria-label={`Slide ${slide.title}`}>
          <div className="le-slide-tools">
            <label>Judul slide
              <input value={slide.title} onChange={(event) => updateSlide((current) => ({ ...current, title: event.target.value || " " }))} />
            </label>
            <div className="le-stepper" role="group" aria-label="Jumlah baris">
              <span className="le-label">Baris</span>
              <button type="button" aria-label="Kurangi baris" disabled={slide.rows <= 1} onClick={() => setRows(slide.rows - 1)}><Minus size={12} /></button>
              <span>{slide.rows}</span>
              <button type="button" aria-label="Tambah baris" disabled={slide.rows >= MAX_ROWS} onClick={() => setRows(slide.rows + 1)}><Plus size={12} /></button>
            </div>
            <div className={`le-fit ${pack.overflow.length ? "bad" : fill > 90 ? "warn" : ""}`} title="Luas terpakai di slide">
              <span style={{ width: `${Math.min(100, fill)}%` }} />
              <small>{pack.overflow.length ? `${pack.overflow.length} tidak muat` : `Terisi ${fill}%`}</small>
            </div>
            <div className="le-slide-actions">
              <button type="button" aria-label="Geser slide lebih awal" disabled={slideIndex === 0} onClick={() => moveSlide(-1)}><ArrowLeft size={14} /></button>
              <button type="button" aria-label="Geser slide lebih akhir" disabled={slideIndex === layout.slides.length - 1} onClick={() => moveSlide(1)}><ArrowRight size={14} /></button>
              <button type="button" aria-label="Hapus slide" disabled={layout.slides.length < 2} onClick={removeSlide}><Trash2 size={14} /></button>
            </div>
          </div>

          <DndContext id={`layout-${tab}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={slide.items.map((item) => item.widgetId)} strategy={rectSortingStrategy}>
              <div className="le-canvas" style={{ gridTemplateRows: `repeat(${slide.rows}, minmax(0, 1fr))` }} data-testid="le-canvas">
                {pack.placed.map((item) => {
                  const itemIndex = slide.items.findIndex((entry) => entry.widgetId === item.widgetId);
                  return (
                    <CanvasItem
                      key={item.widgetId}
                      item={item}
                      position={item}
                      index={itemIndex}
                      last={itemIndex === slide.items.length - 1}
                      onChange={(patch) => patchItem(item.widgetId, patch)}
                      onMove={(direction) => moveItem(itemIndex, itemIndex + direction)}
                      onRemove={() => removeItem(item.widgetId)}
                    />
                  );
                })}
                {slide.items.length === 0 && <p className="le-empty">Slide kosong. Tambahkan widget dari daftar di bawah.</p>}
              </div>
            </SortableContext>
          </DndContext>

          {pack.overflow.length > 0 && (
            <div className="le-overflow" role="alert">
              <strong><AlertTriangle size={14} /> Tidak muat (tidak akan tampil di TV):</strong>
              {pack.overflow.map((item) => (
                <span key={item.widgetId} className="le-pill">
                  {getWidget(item.widgetId)?.title ?? item.widgetId}
                  <button type="button" onClick={() => patchItem(item.widgetId, { w: 3, h: 1 })}>Perkecil</button>
                  <button type="button" onClick={() => removeItem(item.widgetId)}>Lepas</button>
                </span>
              ))}
            </div>
          )}

          <div className="le-palette">
            <h2>Widget tersedia</h2>
            <div className="le-palette-list">
              {tabWidgets.map((widget) => {
                const here = usedHere.has(widget.id);
                return (
                  <button key={widget.id} type="button" className={`le-pill ${usedAnywhere.has(widget.id) ? "used" : "free"}`} disabled={here} onClick={() => addWidget(widget.id)} title={here ? "Sudah ada di slide ini" : "Tambahkan ke slide ini"}>
                    {here ? "✓" : <Plus size={12} />} {widget.title}
                    {!usedAnywhere.has(widget.id) && <em>belum dipakai</em>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
