import { uuid } from "./identity.js";

export interface OutboundEvent {
  event_id: string;
  event: string;
  visitor_id: string;
  session_id: string;
  occurred_at: string;
  properties?: Record<string, unknown>;
}

const FLUSH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;
const MAX_RETRIES = 3;
const MAX_PAYLOAD = 60 * 1024;

export class Transport {
  private queue: OutboundEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private seen = new Set<string>();
  private inflight = 0;

  constructor(private endpoint: string, private projectKey: string) {
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    if (typeof document !== "undefined") {
      addEventListener("pagehide", () => this.flush(true));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") this.flush(true);
      });
    }
  }

  push(e: Omit<OutboundEvent, "event_id" | "occurred_at"> & { event_id?: string }) {
    const evt: OutboundEvent = {
      ...e,
      event_id: e.event_id ?? uuid(),
      occurred_at: new Date().toISOString(),
    };
    if (this.seen.has(evt.event_id)) return; // duplicate-event protection
    this.seen.add(evt.event_id);
    this.queue.push(evt);
    if (this.queue.length >= FLUSH_SIZE) this.flush();
  }

  flush(beacon = false) {
    if (!this.queue.length || this.inflight > 2) return;
    const batch = this.queue.splice(0, 50);
    const body = JSON.stringify({
      project: this.projectKey,
      sent_at: new Date().toISOString(),
      events: batch,
    });
    if (body.length > MAX_PAYLOAD) { this.queue.unshift(...batch.slice(50)); }

    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const ok = navigator.sendBeacon(this.endpoint, new Blob([body], { type: "application/json" }));
      if (ok) return;
    }
    this.inflight++;
    this.send(body, batch, 0);
  }

  private send(body: string, batch: OutboundEvent[], attempt: number) {
    fetch(this.endpoint, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => {
        this.inflight--;
        if (!r.ok && attempt < MAX_RETRIES && r.status >= 500) this.retry(body, batch, attempt);
      })
      .catch(() => {
        this.inflight--;
        if (attempt < MAX_RETRIES) this.retry(body, batch, attempt);
        // after retries, drop — tracker must never disturb the host site
      });
  }

  private retry(body: string, batch: OutboundEvent[], attempt: number) {
    this.inflight++;
    setTimeout(() => this.send(body, batch, attempt + 1), 1000 * 2 ** attempt);
  }
}
