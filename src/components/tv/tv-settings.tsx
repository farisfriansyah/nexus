"use client";

import { useState } from "react";
import { Dialog, Slider, Switch } from "radix-ui";
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/features/preferences/preferences-provider";
import { widgetsForTab } from "@/features/widgets-registry/registry";

const NO_HIDDEN: string[] = [];

export function TvSettings({ tab }: { tab: string }) {
  const [open, setOpen] = useState(false);
  const autoplay = usePreferences((state) => state.autoplay);
  const interval = usePreferences((state) => state.intervalSeconds);
  const hidden = usePreferences((state) => state.hiddenTv[tab] ?? NO_HIDDEN);
  const setAutoplay = usePreferences((state) => state.setAutoplay);
  const setInterval = usePreferences((state) => state.setIntervalSeconds);
  const toggleWidget = usePreferences((state) => state.toggleWidget);
  const reset = usePreferences((state) => state.reset);
  const widgets = widgetsForTab(tab);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="settings-trigger" aria-label="Pengaturan TV">
          <Settings2 size={17} />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="settings-dialog">
          <Dialog.Title>Pengaturan TV</Dialog.Title>
          <Dialog.Description className="muted">Atur slide dan widget untuk tab ini. Preferensi tersimpan di perangkat.</Dialog.Description>
          <section className="settings-section">
            <label className="setting-row" htmlFor="autoplay-switch">
              <span><strong>Swipe otomatis</strong><small>Berpindah slide saat timer selesai</small></span>
              <Switch.Root id="autoplay-switch" className="switch-root" checked={autoplay} onCheckedChange={setAutoplay}><Switch.Thumb className="switch-thumb" /></Switch.Root>
            </label>
            <div className="interval-setting">
              <div className="setting-label"><span>Interval</span><strong>{interval} detik</strong></div>
              <Slider.Root className="slider-root" min={5} max={120} step={1} value={[interval]} onValueChange={([value]) => { if (value !== undefined) setInterval(value); }} aria-label="Interval slide (detik)">
                <Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track>
                <Slider.Thumb className="slider-thumb" />
              </Slider.Root>
            </div>
          </section>
          <section className="settings-section">
            <h3>Widget</h3>
            <div className="widget-toggle-list">
              {widgets.map((widget) => (
                <label className="setting-row widget-setting" key={widget.id} htmlFor={`widget-${widget.id}`}>
                  <span>{widget.title}</span>
                  <Switch.Root id={`widget-${widget.id}`} className="switch-root" checked={!hidden.includes(widget.id)} onCheckedChange={() => toggleWidget("tv", tab, widget.id)}><Switch.Thumb className="switch-thumb" /></Switch.Root>
                </label>
              ))}
            </div>
          </section>
          <div className="dialog-footer">
            <Button variant="outline" onClick={reset}><RotateCcw size={15} /> Reset ke default</Button>
            <Button onClick={() => setOpen(false)}>Selesai</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
