import { requireSession } from "@/lib/auth/session";
import { createLiveSimulator, TICK_MS } from "@/mocks/ops-eng/live";
import { parseScenario } from "@/widgets/ops-eng/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireSession();
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let tickTimer: ReturnType<typeof setInterval> | undefined;
  let closer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        clearInterval(tickTimer);
        clearTimeout(closer);
        try { controller.close(); } catch { /* already closed */ }
      };
      const heartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", at: new Date().toISOString() })}\n\n`));
        } catch {
          stop();
        }
      };
      const params = new URL(request.url).searchParams;
      request.signal.addEventListener("abort", stop);
      if (params.get("live") === "1") {
        const simulator = createLiveSimulator(parseScenario(params.get("scenario")));
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { stop(); }
        };
        send("snapshot", simulator.snapshot());
        tickTimer = setInterval(() => send("tick", simulator.tick()), TICK_MS);
      }
      heartbeat();
      timer = setInterval(heartbeat, 15_000);
      closer = setTimeout(stop, 5 * 60_000);
    },
    cancel() {
      closed = true;
      clearInterval(timer);
      clearInterval(tickTimer);
      clearTimeout(closer);
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
