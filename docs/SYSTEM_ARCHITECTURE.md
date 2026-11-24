# SIGNAL — System Architecture

## Shape: modular monolith

One deployable Next.js application (`apps/web`) containing the dashboard UI and
all APIs (management + ingestion), plus separately buildable packages.
Kafka/K8s/ClickHouse are deliberately deferred; boundaries are drawn so they can
be introduced behind interfaces later.

```
                        ┌────────────────────────────────────────┐
   Tracked websites     │              apps/web (Next.js)        │
   ┌──────────┐         │  ┌─────────────┐   ┌────────────────┐  │
   │ signal.js│──HTTPS──►│  │ /api/v1/*   │   │ App Router UI  │  │
   │ tracker  │  batch   │  │ collect     │   │ (dashboard)    │  │
   └──────────┘         │  │ management  │   └───────┬────────┘  │
                        │  └──────┬──────┘           │           │
                        │         ▼                  ▼           │
                        │   @signal/db (Drizzle) ── PostgreSQL   │
                        │         │            (RLS per tenant)  │
                        │         └── Redis (live presence,      │
                        │              rate limits — optional)   │
                        └────────────────────────────────────────┘

   packages/signal-sdk → built to apps/web/public/signal.js (static, <15 KB)
```

## Modules (inside the monolith)

| Module | Path | Responsibility |
|---|---|---|
| auth | `apps/web/src/lib/auth` | sessions, login, password reset, RBAC guards |
| tenancy | `apps/web/src/lib/tenant.ts` | org/project resolution + RLS context |
| ingestion | `apps/web/src/app/api/v1` | `/collect` batch endpoint, validation, dedup |
| engines | `apps/web/src/lib/engines` | device, geo, attribution, bot, engagement |
| analytics | `apps/web/src/lib/analytics` | query layer over events/aggregates |
| realtime | `apps/web/src/app/api/v1/live` | SSE live-visitor stream |
| sdk | `packages/signal-sdk` | browser tracker (framework-agnostic core) |
| db | `packages/db` | Drizzle schema, migrations, seed |

## Data flow — event ingestion

1. `signal.js` batches events → `POST /api/v1/collect` (`sendBeacon`/`fetch keepalive`).
2. Resolve project by public key → verify request `Origin`/`Referer` host ∈ verified domains.
3. Zod-validate payload (size-capped), strip client-overridable system fields.
4. Rate limit per project key + IP (Redis token bucket, in-memory fallback).
5. Dedup by client `event_id` (idempotency key per project).
6. Server timestamp; parse UA → device engine; IP → local GeoIP → geo engine; IP then discarded (only truncated network kept if configured).
7. Attribution engine classifies source/medium/campaign.
8. Upsert visitor + session; insert events/page views.
9. Publish live-update (SSE channel keyed by project).

## Background processing

- `daily_aggregates` rollups computed on read for small data and by a
  scheduled worker route (`/api/internal/rollup`, cron-invoked) for volume.
- Raw events partitioned monthly when volume justifies it (see DATABASE_DESIGN).

## Scaling interfaces

- `EventSink` interface: today Postgres insert; later Kafka producer.
- `PresenceStore`: today Redis; later dedicated realtime tier.
- `AnalyticsReader`: today SQL over Postgres; later ClickHouse.
