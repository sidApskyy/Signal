# SIGNAL — Development Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 1 Foundation | Scaffold, DB schema+migrations, RLS, auth, orgs, members, design system | Login works, org CRUD, role checks pass, cross-tenant reads blocked |
| 2 Project mgmt | Websites, domains, 3-way verification, keys, install wizard | Verified domain gates ingestion; wizard shows working snippet |
| 3 Tracking SDK | Visitor/session IDs, page views, SPA, UTM, batching, consent, <15 KB build | Tracker on plain HTML emits real events; SPA navs tracked |
| 4 Backend & data | `/collect`, dedup, session upsert, event storage | Events land in Postgres idempotently under load |
| 5 Intelligence | Device/geo/attribution/bot/engagement engines | Events enriched; geo shows country; bots classified |
| 6 Org dashboard | Org overview, website comparison, global filters | Multi-site rollup renders from real data |
| 7 Website analytics | Overview, live visitors (SSE), explorer, geo, devices, sources | Live feed updates <5 s; visitor timeline works |
| 8 Advanced | Custom events, funnels, conversions, scoring, CSV export, saved reports | Funnel computes drop-off; CSV downloads |
| 9 Integrations | React/Next packages, WordPress plugin, Shopify guide | Install paths verified per platform |
| 10 Production | Security review, perf tests (100/500/1000 concurrent), deploy docs, backups | Acceptance criteria (spec §22) green |

Progress is tracked in `IMPLEMENTATION_PROGRESS.md`; decisions in
`ARCHITECTURE_DECISIONS.md`; open problems in `KNOWN_ISSUES.md`.
