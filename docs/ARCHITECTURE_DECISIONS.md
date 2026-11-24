# Architecture Decisions

- **ADR-001 Modular monolith over microservices** — spec mandate; single
  Next.js deployable with module boundaries (engines, analytics, tenancy)
  behind interfaces so Kafka/ClickHouse can slot in later.
- **ADR-002 Postgres RLS + app-level checks** — defense in depth; `app.org_id`
  GUC set per transaction from the authenticated session.
- **ADR-003 Custom session auth** — DB-backed opaque session tokens (hashed at
  rest), avoids external auth SaaS dependency, fits self-hosted mandate.
- **ADR-004 postgres.js driver + Drizzle** — lightweight, typed migrations,
  works in route handlers and scripts.
- **ADR-005 First-party anon UUIDs, no fingerprinting** — privacy spec.
- **ADR-006 Redis optional** — rate limiting + live presence degrade to
  in-memory when `REDIS_URL` unset, keeping dev self-contained.
- **ADR-007 npm workspaces** — no extra package-manager dependency.
