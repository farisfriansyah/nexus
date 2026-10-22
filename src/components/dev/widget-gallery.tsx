"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { widgetRegistry } from "@/features/widgets-registry/registry";
import type { DashboardMode } from "@/features/widgets-registry/types";
import { ScenarioContext } from "@/widgets/ops-eng/_shared/data";
import type { Scenario } from "@/widgets/ops-eng/schemas";
import { ForcedStateContext, type ForcedState } from "@/widgets/_primitives/widget-card";
import "./widget-gallery.css";

const SIZES = {
  S: { label: "S (<20rem)", width: 300, height: 220 },
  M: { label: "M (20–35rem)", width: 480, height: 280 },
  L: { label: "L (≥35rem)", width: 720, height: 320 }
} as const;
type SizeKey = keyof typeof SIZES;

const STATES: { id: string; label: string; scenario: Scenario; forced: ForcedState }[] = [
  { id: "normal", label: "Normal", scenario: "normal", forced: null },
  { id: "mixed", label: "Campuran (warning/critical)", scenario: "mixed", forced: null },
  { id: "critical", label: "Kritis", scenario: "all-critical", forced: null },
  { id: "no_data", label: "Tidak ada data", scenario: "all-nodata", forced: null },
  { id: "stale", label: "Usang", scenario: "stale", forced: null },
  { id: "loading", label: "Loading", scenario: "normal", forced: "loading" },
  { id: "error", label: "Error", scenario: "normal", forced: "error" }
];

export function WidgetGallery() {
  const [mode, setMode] = useState<DashboardMode>("tv");
  const [size, setSize] = useState<SizeKey>("L");
  const [stateId, setStateId] = useState("mixed");
  const [all, setAll] = useState(false);
  const widgets = widgetRegistry.filter((widget) => widget.tab === "ops-eng");
  const active = STATES.find((item) => item.id === stateId)!;
  const states = all ? STATES : [active];
  const dims = SIZES[size];

  return (
    <main className="gallery">
      <header className="gallery-bar">
        <h1>Galeri Widget Ops. Eng <span>(dev only)</span></h1>
        <label>Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as DashboardMode)}>
            <option value="tv">TV</option>
            <option value="analytic">Analitik</option>
          </select>
        </label>
        <label>Ukuran
          <select value={size} onChange={(event) => setSize(event.target.value as SizeKey)}>
            {(Object.keys(SIZES) as SizeKey[]).map((key) => <option key={key} value={key}>{SIZES[key].label}</option>)}
          </select>
        </label>
        <label>State
          <select value={stateId} onChange={(event) => setStateId(event.target.value)} disabled={all}>
            {STATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="gallery-check"><input type="checkbox" checked={all} onChange={(event) => setAll(event.target.checked)} /> Semua state</label>
        <ThemeToggle />
      </header>
      {widgets.map((widget) => {
        const Component = widget.component;
        return (
          <section key={widget.id} className="gallery-widget" data-widget-section={widget.id}>
            <h2>{widget.title} <code>{widget.id}</code></h2>
            <div className="gallery-row">
              {states.map((item) => (
                <figure key={item.id} className="gallery-cell">
                  <figcaption>{item.label}</figcaption>
                  <ScenarioContext.Provider value={item.scenario}>
                    <ForcedStateContext.Provider value={item.forced}>
                      <div className="gallery-frame" data-mode={mode} style={{ width: dims.width, height: mode === "tv" ? dims.height : undefined }}>
                        <Component mode={mode} widgetId={widget.id} title={widget.title} />
                      </div>
                    </ForcedStateContext.Provider>
                  </ScenarioContext.Provider>
                </figure>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
