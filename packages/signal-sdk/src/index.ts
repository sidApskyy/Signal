import { visitorId } from "./identity.js";
import { sessionId, touch } from "./session.js";
import { Transport } from "./transport.js";
import { classify } from "./attribution.js";
import { setStorageDisabled } from "./storage.js";

interface SignalConfig {
  siteId: string;
  endpoint: string;
  consent: "required" | "anonymous" | "off";
  heartbeatMs: number;
  autoPageview: boolean;
}

const script = typeof document !== "undefined" ? (document.currentScript as HTMLScriptElement | null) : null;

function config(): SignalConfig | null {
  if (!script) return null;
  const siteId = script.getAttribute("data-site-id");
  if (!siteId) return null;
  const src = new URL(script.src);
  return {
    siteId,
    endpoint: script.getAttribute("data-endpoint") ?? `${src.origin}/api/v1/collect`,
    consent: (script.getAttribute("data-consent") as SignalConfig["consent"]) ?? "anonymous",
    heartbeatMs: parseInt(script.getAttribute("data-heartbeat") ?? "30000", 10),
    autoPageview: script.getAttribute("data-auto-pageview") !== "false",
  };
}

let consentGranted = true;

export function consent(action: "grant" | "revoke") {
  consentGranted = action === "grant";
  if (!consentGranted) setStorageDisabled(true);
}

export function track(name: string, properties: Record<string, unknown> = {}) {
  const cfg = state.cfg;
  if (!cfg || !consentGranted) return;
  const { id: sid } = sessionId();
  state.transport.push({
    event: "custom",
    visitor_id: visitorId(),
    session_id: sid,
    properties: { name: String(name).slice(0, 120), ...sanitize(properties) },
  });
}

function sanitize(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (/password|secret|token|credit|ssn|card/i.test(k)) continue; // never collect sensitive values
    if (typeof v === "string") out[k] = v.slice(0, 500);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

function pageProps(): Record<string, unknown> {
  const a = state.attribution;
  return {
    path: location.pathname + location.search,
    title: document.title,
    ...(state.isFirstPage ? { ...a, viewport: `${innerWidth}x${innerHeight}`, screen: `${screen.width}x${screen.height}` } : {}),
  };
}

function emitPageview() {
  const cfg = state.cfg;
  if (!cfg || !consentGranted) return;
  const { id: sid, isNew } = sessionId();
  if (isNew) {
    state.attribution = classify(location, document);
    state.transport.push({ event: "session_start", visitor_id: visitorId(), session_id: sid, properties: { ...state.attribution } });
  }
  state.transport.push({
    event: "page_view",
    visitor_id: visitorId(),
    session_id: sid,
    properties: pageProps(),
  });
  state.isFirstPage = false;
}

function hookSpa() {
  const wrap = (type: "pushState" | "replaceState") => {
    const orig = history[type];
    history[type] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const ret = orig.apply(this, args);
      dispatchEvent(new Event("signal:navigate"));
      return ret;
    };
  };
  wrap("pushState"); wrap("replaceState");
  addEventListener("popstate", () => dispatchEvent(new Event("signal:navigate")));
  addEventListener("hashchange", () => dispatchEvent(new Event("signal:navigate")));
  addEventListener("signal:navigate", () => { touch(); setTimeout(emitPageview, 0); });
}

function heartbeat() {
  setInterval(() => {
    if (document.visibilityState !== "visible" || !consentGranted) return;
    touch();
    const { id: sid } = sessionId();
    state.transport.push({ event: "heartbeat", visitor_id: visitorId(), session_id: sid });
  }, state.cfg!.heartbeatMs);
}

interface State {
  cfg: SignalConfig | null;
  transport: Transport;
  attribution: ReturnType<typeof classify>;
  isFirstPage: boolean;
}

const state: State = {
  cfg: config(),
  transport: null as unknown as Transport,
  attribution: { channel: "direct" },
  isFirstPage: true,
};

function init() {
  const cfg = state.cfg;
  if (!cfg) return;
  if (cfg.consent === "required") consentGranted = false;
  if (typeof navigator !== "undefined" && (navigator as Navigator & { doNotTrack?: string }).doNotTrack === "1" && cfg.consent !== "anonymous") {
    consentGranted = false;
  }
  state.transport = new Transport(cfg.endpoint, cfg.siteId);
  state.attribution = classify(location, document);
  if (cfg.autoPageview) emitPageview();
  hookSpa();
  heartbeat();
  addEventListener("pagehide", () => {
    if (!consentGranted) return;
    const { id: sid } = sessionId();
    state.transport.push({ event: "session_end", visitor_id: visitorId(), session_id: sid });
  });
}

init();

const api = { track, consent, identify: (id: string) => { void id; /* first-party anon IDs only */ } };
(globalThis as Record<string, unknown>).SIGNAL = api;
export default api;
