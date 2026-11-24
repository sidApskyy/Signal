# SIGNAL — Tracking SDK (`@signal/sdk`)

Framework-agnostic TypeScript tracker built to a single `signal.js` (< 15 KB
compressed goal). Adapters for React/Next/WordPress wrap the same core.

```html
<script defer src="https://<host>/signal.js" data-site-id="sig_pk_…"></script>
```

## Modules (packages/signal-sdk/src)

- `core/` — init from `data-site-id` + `data-*` options, queue dispatcher
- `identity/` — anonymous visitor UUID (first-party random, `localStorage`
  w/ cookie+memory fallback), never fingerprinting
- `sessions/` — session UUID, 30-min inactivity timeout, persisted across pages
- `events/` — page_view, custom `SIGNAL.track(name, props)`, conversions;
  client `event_id` UUID for dedup
- `navigation/` — history.pushState/replaceState/popstate + hashchange hooks,
  title capture, entry/exit page
- `attribution/` — referrer classification + UTM capture on session start
- `consent/` — `SIGNAL.consent(grant|revoke)`, storage gated by project config
- `transport/` — batch queue (flush at 10 events / 5 s / pagehide),
  `sendBeacon` → `fetch keepalive` fallback, bounded retries (3, exp backoff)
- `storage/` — localStorage → cookie → memory downgrade chain
- `plugins/` — optional click/form listeners (never capture field values)

## Behavior

- Heartbeat every 30 s while `document.visibilityState === 'visible'`;
  paused when hidden.
- `session_start` on create, `session_end` + final flush via beacon on exit.
- SPA navigations emit page views; same `event_id` never sent twice.
- Tracker failure must never affect the host site: all errors swallowed,
  async loading, zero blocking work before first paint.
- `doNotTrack`/consent-denied → no storage, events dropped unless
  project consent_mode = 'anonymous' (then cookieless sessionless stats).

## Global API

```ts
SIGNAL.track(name: string, props?: Record<string, unknown>): void
SIGNAL.consent(action: 'grant' | 'revoke'): void
SIGNAL.identify(anonymousId: string): void  // first-party only
```

## Platform installs

- **HTML**: script tag above.
- **React/Next**: `@signal/react` `<SignalProvider siteId>` / Script tag in layout.
- **WordPress**: plugin injects tag in `wp_head`.
- **Shopify**: tag in theme.liquid.
All use the same `signal.js`; no framework dependency in core.
