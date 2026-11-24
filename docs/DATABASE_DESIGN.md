# SIGNAL — Database Design

PostgreSQL 16, Drizzle ORM, UUID PKs (`gen_random_uuid()`), UTC timestamptz.

## Tables

### Identity & tenancy
- `users` — email (unique, citext), password_hash, name, mfa_secret, email_verified_at
- `auth_sessions` — user_id, token_hash (unique), expires_at, ip, user_agent
- `password_reset_tokens`, `email_verification_tokens` — token_hash, expires_at
- `organizations` — name, slug (unique)
- `organization_members` — (org_id, user_id) unique, role: owner|admin|analyst|viewer, invited_by, accepted_at

### Projects
- `projects` — org_id FK, name, url, timezone, environment, retention_days,
  consent_mode, engagement_weights jsonb, created_at
- `project_domains` — project_id FK, host, environment, verification_method,
  verification_token, verified_at; unique(project_id, host)
- `project_keys` — project_id FK, public_key (unique, `sig_pk_…`),
  rotated_at, revoked_at
- `event_definitions` — project_id, name, kind, props_schema jsonb, enabled
- `saved_reports` — project_id, name, definition jsonb, created_by
- `admin_audit_logs` — org_id, actor_id, action, target, metadata, created_at

### Analytics data
- `visitors` — project_id, visitor_id (client anon id), first_seen, last_seen,
  country_code, device_category, consent_status; unique(project_id, visitor_id)
- `sessions` — project_id, visitor_id FK, started_at, last_seen_at, ended_at,
  entry_page, exit_page, page_count, duration_s, referrer_host, utm_*,
  country_code, device, browser, os, bot_class; index (project_id, last_seen_at)
- `events` — project_id, session_id, visitor_id, event_id (client idempotency),
  name, occurred_at, page_path, props jsonb; unique(project_id, event_id);
  indexes (project_id, occurred_at), (project_id, name), (session_id)
- `page_views` — project_id, session_id, visitor_id, path, title, occurred_at,
  time_on_page_ms; indexes (project_id, path), (project_id, occurred_at)
- `attributions` — visitor_id/session_id, channel, source, medium, campaign,
  referrer_host, landing_page
- `geo_locations` — network prefix → country/region/city (reference cache)
- `consent_records` — visitor_id, status, granted_at, revoked_at
- `daily_aggregates` — project_id, date, metric dims (country, device, source,
  page), visitors, sessions, page_views, events; unique(project_id, date, dims)

## Isolation

- Every tenant table carries `organization_id` (or joins via `project_id`)
  and Postgres **Row-Level Security**: `current_setting('app.org_id')` is set
  per transaction from the authenticated session, never from client input.
- Unique constraints are tenant-scoped (e.g. `unique(project_id, host)`).

## Indexes (common query patterns)

`organization_id`, `project_id`, `visitor_id`, `session_id`, `occurred_at`,
`event name`, `page_path`, `country_code` — per the spec; composite
`(project_id, occurred_at)` drives all date-range analytics.

## Lifecycle

- Raw events separated from `daily_aggregates` (raw = source of truth,
  aggregates = fast reads).
- Retention: `projects.retention_days` → worker deletes raw events beyond it.
- Deletion: org → cascade projects → events; user deletion keeps audit rows
  with actor_id nulled via soft FK.
- IPs are not stored; geolocation is resolved at ingest then discarded.
- Monthly `PARTITION BY RANGE (occurred_at)` on `events` is prepared in the
  migration tooling but only enabled past a volume threshold.
