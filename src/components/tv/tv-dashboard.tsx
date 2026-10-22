"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { packSlide, resolveLayout } from "@/features/layout/resolver";
import { GRID_COLS } from "@/features/layout/schema";
import type { TabLayout } from "@/features/layout/schema";
import { getWidget } from "@/features/widgets-registry/registry";
import { WidgetBoundary } from "@/components/widgets/widget-boundary";
import { TvControls } from "@/components/tv/tv-controls";
import { usePreferences } from "@/features/preferences/preferences-provider";
import { usePathname, useRouter } from "next/navigation";
import { useLiveStream } from "@/lib/sse/use-live-stream";

const NO_HIDDEN: string[] = [];

export function TvDashboard({ layout, tab, debug, heartbeatReloadMinutes }: { layout: TabLayout; tab: string; debug: boolean; heartbeatReloadMinutes: number }) {
  const hidden = usePreferences((state) => state.hiddenTv[tab] ?? NO_HIDDEN);
  const autoplayEnabled = usePreferences((state) => state.autoplay);
  const intervalSeconds = usePreferences((state) => state.intervalSeconds);
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const router = useRouter();
  const layoutKey = useMemo(() => JSON.stringify(layout.slides), [layout]);
  const { lastEventAt } = useLiveStream("/api/mock/stream");
  const slides = useMemo(() => resolveLayout(layout, new Set(hidden)), [layout, hidden]);
  const emblaOptions = useMemo(() => ({ loop: slides.length > 1, duration: 35 }), [slides.length]);
  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [idle, setIdle] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [cursorHidden, setCursorHidden] = useState(false);

  const navigate = useCallback((index: number) => {
    if (reducedMotion) emblaApi?.scrollTo(index, true);
    else emblaApi?.scrollTo(index);
  }, [emblaApi, reducedMotion]);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    update();
    return () => { emblaApi.off("select", update); emblaApi.off("reInit", update); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    try {
      emblaApi.reInit();
      emblaApi.scrollTo(0, true);
    } catch {
      // viewport belum siap; Embla akan diinisialisasi ulang pada render berikutnya
    }
  }, [emblaApi, slides.length]);

  useEffect(() => {
    let idleTimer = window.setTimeout(() => setIdle(true), 10_000);
    const activity = () => {
      setIdle(false);
      setProgress(0);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdle(true), 10_000);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "wheel"];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, activity));
    };
  }, []);

  useEffect(() => {
    let timeout = 0;
    const show = () => {
      setCursorHidden(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setCursorHidden(true), 5000);
    };
    window.addEventListener("pointermove", show);
    show();
    return () => { window.removeEventListener("pointermove", show); window.clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    const heartbeatMs = heartbeatReloadMinutes * 60_000;
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastEventAt > heartbeatMs) window.location.reload();
    }, 60_000);
    return () => window.clearInterval(watchdog);
  }, [heartbeatReloadMinutes, lastEventAt]);

  useEffect(() => {
    const visibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    if (!autoplayEnabled || pausedByUser || !idle || slides.length < 2 || !documentVisible) {
      return () => document.removeEventListener("visibilitychange", visibility);
    }
    let started = Date.now();
    const timer = window.setInterval(() => {
      const percent = Math.min(100, ((Date.now() - started) / (intervalSeconds * 1000)) * 100);
      setProgress(percent);
      if (percent >= 100) {
        started = Date.now();
        emblaApi?.scrollNext();
        setProgress(0);
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [autoplayEnabled, pausedByUser, idle, documentVisible, slides.length, intervalSeconds, emblaApi, selected]);

  // Layout diubah lewat editor: bandingkan dengan versi terbit, lalu refresh data server.
  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/layout/${tab}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((loaded: { layout?: TabLayout } | null) => { if (loaded?.layout && JSON.stringify(loaded.layout.slides) !== layoutKey) router.refresh(); })
        .catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [tab, layoutKey, router]);

  useEffect(() => {
    const keyboard =  (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") emblaApi?.scrollNext();
      if (event.key === "ArrowLeft") emblaApi?.scrollPrev();
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [emblaApi]);

  return (
    <div className={`tv-canvas ${cursorHidden ? "cursor-hidden" : ""}`} data-testid="tv-canvas">
      <div className="tv-slide-viewport" ref={emblaRef}>
        <div className="tv-slide-track">
          {slides.length === 0 && (
            <section className="tv-slide is-active"><div className="empty-slides">Semua widget pada tab ini disembunyikan.</div></section>
          )}
          {slides.map((slide, slideIndex) => (
            <section className={`tv-slide ${slideIndex === selected ? "is-active" : ""}`} aria-label={slide.title} key={slide.id}>
              <div className="slide-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${slide.rows}, minmax(0, 1fr))` }}>
                {packSlide(slide.items, slide.rows).placed.map((item) => {
                  const widget = getWidget(item.widgetId);
                  const position = { gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}` };
                  if (!widget) return <div className="empty-widget" key={item.widgetId} style={position}>Widget &quot;{item.widgetId}&quot; belum tersedia</div>;
                  const Widget = widget.component;
                  return (
                    <div className="widget-cell" key={item.widgetId} style={position} data-widget-id={widget.id} data-debug={debug ? "true" : undefined}>
                      {debug && <span className="debug-label">{widget.id}</span>}
                      <WidgetBoundary widgetName={widget.title}>
                        <Widget mode="tv" widgetId={widget.id} title={widget.title} />
                      </WidgetBoundary>
                      {debug && <span className="debug-size" data-size-for={widget.id}>-- × --</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
      {debug && <DebugSizer />}
      <TvControls
        selected={selected}
        slideCount={slides.length}
        progress={progress}
        paused={pausedByUser || !autoplayEnabled}
        onTogglePause={() => setPausedByUser((value) => !value)}
        onSelect={navigate}
      />
      <span className="sr-only" aria-live="polite">Slide {selected + 1} dari {slides.length} di {pathname}</span>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function DebugSizer() {
  useEffect(() => {
    const update = () => document.querySelectorAll<HTMLElement>("[data-size-for]").forEach((label) => {
      const widgetId = label.dataset.sizeFor;
      const cell = document.querySelector<HTMLElement>(`[data-widget-id="${widgetId}"]`);
      if (cell) label.textContent = `${Math.round(cell.clientWidth)} × ${Math.round(cell.clientHeight)} px`;
    });
    update();
    const observer = new ResizeObserver(update);
    document.querySelectorAll("[data-widget-id]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <span className="debug-grid-label">Layout debug</span>;
}
