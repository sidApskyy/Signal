# SIGNAL — Universal Website Visitor Intelligence

By **RDCS GENIX**. A self-hosted, multi-tenant analytics and visitor-intelligence platform:
one platform, one universal tracking engine, many organizations, unlimited websites, complete data isolation.

## Stack

- `apps/web` — Next.js 15 (App Router) + TypeScript + Tailwind. Hosts the dashboard UI **and** all API routes (`/api/v1/*`, `/api/auth/*`, `/api/v1/collect`).
- `packages/signal-sdk` — first-party JS tracker, `signal.js`, **2.6 KB gzip**.
- `packages/db` — Drizzle ORM schema, migrations, RLS policy, seed.
- PostgreSQL 16 (tenant isolation via RLS) + Redis (rate-limit/live cache).
- `scripts/traffic-gen.mjs` — synthetic traffic generator.

## Quick start

```bash
cp .env.example apps/web/.env
docker compose up -d            # postgres + redis
npm install
npm run db:migrate --workspace @signal/db   # schema + RLS
npm run db:seed   --workspace @signal/db    # demo org + data
npm run sdk:build                             # builds public/signal.js
npm run dev                                   # http://localhost:3000
```

Log in: `demo@rdcsgenix.local` / `signal-demo-123`.

## Install the tracker on a website

```html
<script defer src="https://<your-signal-host>/signal.js"
        data-site-id="sig_pk_<project-key>"></script>
```

The domain serving that page must be added and verified under **Projects → Domains**
(DNS TXT, HTML file, or meta tag). Unverified origins are rejected by `/api/v1/collect`.

## Verify

- Unit tests: `npx vitest run` in `apps/web` and `packages/signal-sdk` (28 tests).
- Traffic: `node scripts/traffic-gen.mjs <sig_pk> [concurrency] [events] [origin]`.

## Docs

`docs/` — product spec, architecture, database design, API spec, SDK spec,
security & privacy, roadmap, deployment guide, testing strategy,
implementation progress, known issues, architecture decisions.
