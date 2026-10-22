"use client";

import { useEffect, useState } from "react";
import { Maximize, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/features/preferences/preferences-provider";

export function TvControls({
  selected, slideCount, progress, paused, onTogglePause, onSelect
}: {
  selected: number; slideCount: number; progress: number; paused: boolean;
  onTogglePause: () => void; onSelect: (index: number) => void;
}) {
  const [wakeSupported] = useState(() => typeof navigator !== "undefined" && "wakeLock" in navigator);
  const [fullscreen, setFullscreen] = useState(false);
  const intervalSeconds = usePreferences((state) => state.intervalSeconds);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (!wakeSupported) return;
    let lock: WakeLockSentinel | undefined;
    const requestLock = () => {
      if (document.visibilityState !== "visible") return;
      void navigator.wakeLock.request("screen").then((requested) => { lock = requested; })
        .catch(() => undefined);
    };
    const visibility = () => {
      if (document.visibilityState === "visible") requestLock();
      else if (lock && !lock.released) void lock.release().catch(() => undefined);
    };
    requestLock();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      if (lock && !lock.released) void lock.release().catch(() => undefined);
    };
  }, [wakeSupported]);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  }

  return (
    <div className="tv-controls">
      <div className="slide-dots" role="group" aria-label="Pilih slide">
        {Array.from({ length: slideCount }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Slide ${index + 1}`}
            aria-current={selected === index ? "true" : undefined}
            className={`slide-dot ${selected === index ? "active" : ""}`}
            onClick={() => onSelect(index)}
          />
        ))}
      </div>
      <div className="slide-progress" aria-hidden="true"><span style={{ width: `${paused ? 0 : progress}%` }} /></div>
      <Button variant="ghost" size="icon" aria-label={paused ? "Putar slide" : "Jeda slide"} onClick={onTogglePause}>
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </Button>
      <span className="interval-readout">{intervalSeconds}s</span>
      <Button variant="ghost" size="icon" aria-label={fullscreen ? "Keluar layar penuh" : "Layar penuh"} onClick={() => void toggleFullscreen()}>
        <Maximize size={15} />
      </Button>
    </div>
  );
}
