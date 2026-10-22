"use client";

import { useEffect, useState } from "react";

export function useLiveStream(source: string) {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer = 0;
    let pollTimer = 0;
    let attempt = 0;
    let disposed = false;

    const poll = () => {
      if (disposed) return;
      const heartbeatUrl = source.replace(/\/stream$/, "/heartbeat");
      pollTimer = window.setInterval(() => {
        void fetch(heartbeatUrl)
          .then((response) => { setConnected(response.ok); if (response.ok) setLastEventAt(Date.now()); })
          .catch(() => setConnected(false));
      }, Math.min(30_000, 2_000 * 2 ** Math.min(attempt, 4)));
    };

    const connect = () => {
      if (disposed) return;
      eventSource = new EventSource(source);
      eventSource.onopen = () => { attempt = 0; setConnected(true); window.clearInterval(pollTimer); };
      eventSource.onmessage = () => { setConnected(true); setLastEventAt(Date.now()); };
      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        attempt += 1;
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
        reconnectTimer = window.setTimeout(connect, delay);
        if (attempt >= 3 && !pollTimer) poll();
      };
    };

    connect();
    return () => {
      disposed = true;
      eventSource?.close();
      window.clearTimeout(reconnectTimer);
      window.clearInterval(pollTimer);
    };
  }, [source]);

  return { connected, lastEventAt };
}
