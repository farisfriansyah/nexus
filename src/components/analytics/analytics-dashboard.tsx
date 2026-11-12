"use client";
import { nowMs } from "@/lib/status/time";

import { useMemo, useState } from "react";
import { QueryProvider } from "@/components/providers/query-provider";
import { Button } from "@/components/ui/button";
import { currentPeriod, periodLabel, shiftPeriod } from "@/lib/status/time";
import { PeriodContext } from "@/widgets/ops-eng/_shared/data";
import { WidgetBoundary } from "@/components/widgets/widget-boundary";
import { WidgetDrawer } from "@/components/widgets/widget-drawer";
import { getWidget } from "@/features/widgets-registry/registry";
import { resolveLegacyLayout } from "@/features/layout/resolver";
import type { LegacyLayout } from "@/config/layouts/legacy";
import { usePreferences } from "@/features/preferences/preferences-provider";
import { useLiveStream } from "@/lib/sse/use-live-stream";
import { Switch } from "radix-ui";
import { widgetsForTab } from "@/features/widgets-registry/registry";
import { TravoSlideProvider } from "@/features/travo/provider";

const NO_HIDDEN: string[] = [];

export function AnalyticsDashboard({ layout, tab }: { layout: LegacyLayout; tab: string }) {
  return <QueryProvider><AnalyticsContent layout={layout} tab={tab} /></QueryProvider>;
}

function AnalyticsContent({ layout, tab }: { layout: LegacyLayout; tab: string }) {
  const hidden = usePreferences((state) => state.hiddenAnalytic[tab] ?? NO_HIDDEN);
  const periods = useMemo(() => { const end = currentPeriod(nowMs()); return Array.from({ length: 12 }, (_, index) => shiftPeriod(end, -index)); }, []);
  const [period, setPeriod] = useState(periods[0]!);
  const [pic, setPic] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openSlideId, setOpenSlideId] = useState("");
  const toggleWidget = usePreferences((state) => state.toggleWidget);
  const live = useLiveStream("/api/mock/stream");
  const slides = resolveLegacyLayout(layout, new Set(hidden));
  const pics = useMemo(() => [...new Set(widgetsForTab(tab).flatMap((widget) => widget.pics ?? []))].sort(), [tab]);
  const openWidget = openId ? getWidget(openId) : undefined;
  const Detail = openWidget?.detail;

  return (
    <PeriodContext.Provider value={period}>
    <main className="analytics-page">
      <section className="filter-bar" aria-label="Filter analitik">
        <label>Periode<select value={period} onChange={(event) => setPeriod(event.target.value)}>{periods.map((item) => <option key={item} value={item}>{periodLabel(item)}</option>)}</select></label>
        <label>PIC<select value={pic} onChange={(event) => setPic(event.target.value)}><option value="">Semua PIC</option>{pics.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <button className="button button-outline button-sm" type="button" disabled>Export</button>
        <details className="analytics-widget-settings">
          <summary>Widget</summary>
          <div className="analytics-widget-list">
            {widgetsForTab(tab).map((widget) => (
              <label key={widget.id} htmlFor={`analytic-${widget.id}`}>
                <span>{widget.title}</span>
                <Switch.Root id={`analytic-${widget.id}`} className="switch-root" checked={!hidden.includes(widget.id)} onCheckedChange={() => toggleWidget("analytic", tab, widget.id)}>
                  <Switch.Thumb className="switch-thumb" />
                </Switch.Root>
              </label>
            ))}
          </div>
        </details>
        <span className="stream-status" aria-live="polite">{live.connected ? "Live" : "Menghubungkan…"}</span>
      </section>
      {slides.map((slide) => (
        <TravoSlideProvider slideId={slide.id} key={slide.id}>
          <section className="analytic-section" aria-labelledby={`section-${slide.id}`}>
            <h2 id={`section-${slide.id}`}>{slide.title}</h2>
            <div className="analytic-grid">
              {slide.rows.map((row) => (
                <div className="analytic-row" key={row.id} style={{ gridTemplateColumns: row.columns.map((column) => `${column.span ?? 1}fr`).join(" ") }}>
                  {row.columns.map((column) => {
                    const widget = column.widgetId ? getWidget(column.widgetId) : undefined;
                    if (!widget) return null;
                    const Widget = widget.component;
                    const dim = Boolean(pic) && Boolean(widget.pics?.length) && !widget.pics!.includes(pic);
                    return (
                      <article className="analytic-widget" key={column.id} data-dim={dim ? "true" : undefined} data-widget-id={widget.id} onClick={() => { setOpenSlideId(slide.id); setOpenId(widget.id); }}>
                        <WidgetBoundary widgetName={widget.title}><Widget mode="analytic" widgetId={widget.id} title={widget.title} /></WidgetBoundary>
                        <Button className="widget-drawer-trigger" variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setOpenSlideId(slide.id); setOpenId(widget.id); }}>Detail</Button>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </TravoSlideProvider>
      ))}
      <TravoSlideProvider slideId={openSlideId}>
        <WidgetDrawer title={openWidget?.title ?? ""} open={Boolean(openWidget)} onOpenChange={(open) => { if (!open) { setOpenId(null); setOpenSlideId(""); } }}>
          {openWidget && Detail ? <Detail widgetId={openWidget.id} title={openWidget.title} /> : undefined}
        </WidgetDrawer>
      </TravoSlideProvider>
    </main>
    </PeriodContext.Provider>
  );
}
