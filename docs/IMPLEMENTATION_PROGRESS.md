# Implementation Progress

Living document. Updated per phase. Statuses: ✅ verified · 🟡 partial · ⬜ not started.

## Phase 0 — Documentation & Planning ✅

All nine planning docs complete: PRODUCT_SPECIFICATION, SYSTEM_ARCHITECTURE,
DATABASE_DESIGN, API_SPECIFICATION, TRACKING_SDK, SECURITY_AND_PRIVACY,
DEVELOPMENT_ROADMAP, DEPLOYMENT_GUIDE, TESTING_STRATEGY.

## Phase 1 — Foundation ✅

- Monorepo scaffold: `apps/web` (Next.js 15 + TS + Tailwind), `packages/db`, `packages/signal-sdk`.
- docker-compose: PostgreSQL 16 + Redis 7 with healthchecks.
- DB: Drizzle schema, 18 tables, tenant-scoped unique indexes, generated migrations.
- RLS: `signal_app` role subject to `tenant_isolation` policies on all tenant tables;
  app reads via `withOrg(orgId)` which sets `app.org_id` inside a transaction.
- Auth: scrypt password hashing, sha256 session tokens, 30-day `auth_sessions`,
  `signal_session` + `sig_org` + `sig_project` cookies.
- RBAC: owner > admin > analyst > viewer + platform owner, enforced in `assertProjectAccess`.
- Verified: login/logout/me endpoints; RLS blocks cross-org reads (manual psql check).

## Phase 2 — Project Management ✅

- Projects CRUD API + `/projects` list page + `/projects/new` 4-step install wizard.
- `project_domains` with environment tagging; verification tokens; DNS TXT /
  HTML file / meta-tag verification methods implemented in the verify endpoint.
- `project_keys` with `sig_pk_*` public keys; regenerate endpoint.
- Seed: demo org `rdcs-genix-demo`, demo project, verified `localhost`/`localhost:4000`.

## Phase 3 — Tracking SDK ✅

- `signal.js` — **2.6 KB gzip** (<15 KB target), IIFE, no dependencies.
- Visitor ID (persistent, first-party cookie + storage fallback), session ID (30-min inactivity rotation).
- Auto page views + SPA history interception, custom `SIGNAL.track()`, `SIGNAL.identify()`, `SIGNAL.consent()`.
- Batching (10 events or 5 s flush), `sendBeacon` → `fetch keepalive` fallback, `client_event_id` dedup ids.
- Property sanitizer drops `/password|secret|token|credit|ssn|card/i` keys client-side.
- Fails silent on any error — can never break the host site.
- Verified: served at `/signal.js`, `data-site-id` init, events reach `/api/v1/collect`.

## Phase 4 — Ingestion & Event Storage ✅

- `POST /api/v1/collect`: payload cap (64 KB), per-IP and per-key rate limits (Redis),
  Zod validation (≤50 events/batch), key → project resolution, verified-host check
  (Origin/Referer must match a verified domain incl. subdomains).
- Per-event enrichment: UA parsing (device/browser/OS), bot classification, GeoIP
  (local DB hook; offline fallback), referrer/UTM attribution.
- Idempotent upserts for visitors/sessions; `ON CONFLICT` dedup on `client_event_id`;
  session counters (pageviews, duration, bounce) updated atomically.
- Verified: `accepted:3` → resend `duplicates:1`; `evil.example.com` → `unverified_domain`;
  bad key → `unknown_project`.
- Synthetic traffic: 100 concurrent sessions → 734 events in 581 ms (~1,263/s, p95 540 ms, 0 failures).

## Phase 5 — Intelligence Engine + Dashboards ✅ (core)

- SSE `/live` stream: active sessions (90 s window, humans only), verified end-to-end.
- Analytics endpoints: overview (totals + trend + top pages + channels + per-website rollup),
  live, visitors (list + profile timeline), geo (country/region/city + MapLibre choropleth),
  devices (browser/OS/device splits), sources (channel/medium/source/campaign),
  behavior (paths, entry/exit, engagement), funnels (step query), export (CSV), events.
- 10 dashboard modules rendered with SIGNAL design system: Overview, Live Visitors,
  Visitor Explorer, Geography, Devices, Traffic Sources, Behaviour, Funnels, Reports, Settings.
- Verified visually: overview renders 139 visitors / 161 sessions / 867 page views / live count.

## Phase 6 — Consent, Privacy & Compliance 🟡

- ✅ Consent mode per project (strict/anonymous), consent API, DPDP/GDPR-aligned retention fields,
  IP never stored (hash + /24 truncation at ingest), DNT honored by tracker.
- ⬜ Automated retention-purge job, per-country consent presets.

## Phase 7–9 — Tests, Hardening, Polish 🟡

- ✅ 28 unit tests (auth, collect schema, sanitize, host allowlist, bots, devices, sessions, attribution).
- ✅ Synthetic traffic generator at 100/500/1000 concurrency.
- ✅ Build clean (`next build`, `tsc --noEmit`).
- ⬜ Load-test 500/1000 on production build, E2E UI test suite, security audit pass,
  backup/restore runbook, deploy checklist execution.

## Report — completed

Docs, scaffold, schema+RLS, auth/RBAC, projects/domains/keys + wizard, tracker SDK,
collect pipeline with dedup+rate-limits+verified domains, intelligence endpoints,
10 dashboard pages, tests, traffic generator, seed/demo data.

## Report — remaining

Retention-purge job, per-country presets, fuller test coverage (integration/E2E),
production deploy artifacts (systemd/k8s manifests per DEPLOYMENT_GUIDE),
500/1000-concurrency load profile on prod build, wiki/docs polish.
