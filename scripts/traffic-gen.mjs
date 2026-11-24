#!/usr/bin/env node
/**
 * Synthetic traffic generator — drives concurrent simulated sessions at the
 * ingestion endpoint. Usage:
 *   node scripts/traffic-gen.mjs <projectKey> [concurrency] [eventsPerSession] [origin]
 */
import { randomUUID } from "node:crypto";

const [key, concurrency = 100, perSession = 6, origin = "http://localhost:4000"] = process.argv.slice(2);
const ENDPOINT = process.env.SIGNAL_ENDPOINT ?? "http://localhost:3000/api/v1/collect";
if (!key) { console.error("usage: traffic-gen.mjs <sig_pk_...> [concurrency] [events] [origin]"); process.exit(1); }

const UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/127.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1",
  "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36",
];
const PATHS = ["/", "/services", "/pricing", "/contact", "/blog/post", "/about"];
const SOURCES = [
  { channel: "organic_search", utm_source: "google", referrer: "https://google.com/" },
  { channel: "direct" },
  { channel: "social", utm_source: "linkedin", referrer: "https://linkedin.com/" },
  { channel: "paid", utm_source: "google", utm_medium: "cpc", utm_campaign: "q4" },
];

const stats = { sent: 0, accepted: 0, dup: 0, err: 0, ms: [] };
const t0 = Date.now();

async function runSession(i) {
  const vid = `gen-${i}-${randomUUID().slice(0, 8)}`;
  const sid = `gen-${i}-${randomUUID().slice(0, 8)}`;
  const src = SOURCES[i % SOURCES.length];
  const events = [{ event_id: randomUUID(), event: "session_start", visitor_id: vid, session_id: sid, properties: src }];
  for (let p = 0; p < perSession; p++) {
    events.push({
      event_id: randomUUID(), event: "page_view", visitor_id: vid, session_id: sid,
      properties: { path: PATHS[(i + p) % PATHS.length], title: "Gen" },
    });
  }
  if (i % 3 === 0) events.push({ event_id: randomUUID(), event: "custom", visitor_id: vid, session_id: sid, properties: { name: "cta_clicked" } });

  const t = Date.now();
  try {
    const r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, "User-Agent": UAS[i % UAS.length] },
      body: JSON.stringify({ project: key, events }),
    });
    const j = await r.json().catch(() => ({}));
    stats.ms.push(Date.now() - t);
    stats.sent += events.length;
    if (r.ok) { stats.accepted += j.accepted ?? 0; stats.dup += j.duplicates ?? 0; }
    else stats.err++;
  } catch { stats.err++; }
}

const workers = Array.from({ length: Number(concurrency) }, (_, i) => runSession(i));
await Promise.all(workers);

const wall = Date.now() - t0;
const sorted = stats.ms.sort((a, b) => a - b);
console.log(JSON.stringify({
  concurrency: Number(concurrency), events_sent: stats.sent, accepted: stats.accepted,
  duplicates: stats.dup, failed_batches: stats.err, wall_ms: wall,
  events_per_s: Math.round((stats.sent / wall) * 1000),
  latency_ms: { p50: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)], max: sorted[sorted.length - 1] },
}, null, 2));
