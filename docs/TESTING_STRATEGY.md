# SIGNAL — Testing Strategy

Runner: **Vitest** (unit/integration) + **Playwright-style** e2e via the
testing agent for UI flows. `apps/web` API tests run against a real Postgres
from docker-compose (test DB `signal_test`).

## Suites

| Area | Tests |
|---|---|
| Auth | valid/invalid login, session expiry, role permission matrix, unauthorized access |
| Tenant isolation | org A vs B, project A vs B across API, cache, export, worker paths; RLS enforcement |
| Tracking SDK | first visit, returning visit, 30-min new session, SPA nav, dedup, UTM capture, consent off, offline server, ad-blocker resilience |
| Install | plain HTML, React, Next.js, WordPress mock, multi-domain |
| Security | bad project key, unverified domain, oversized/malformed payloads, XSS input, SQLi attempts, rate limits, key rotation |
| Performance | synthetic generator at 100/500/1000 concurrent sessions; batch ingest; large date-range queries; visitor search |

## Rules

- No feature is "done" without its test.
- Never fabricate pass results; failures get filed in KNOWN_ISSUES.md.
- Test data is seeded via `npm run seed` and labeled — never mixed with real
  visitor data; production analytics never hardcode demo metrics.
- CI gate (future): `npm test && npm run build` must pass per PR.
