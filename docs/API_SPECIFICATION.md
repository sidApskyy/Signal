# SIGNAL — API Specification

REST, JSON, versioned under `/api/v1`. Session-cookie auth for management
routes; public tracking key for ingestion. All management routes enforce
org membership + role server-side.

## Ingestion (public)

### `POST /api/v1/collect`
Headers: `Content-Type: application/json`, `Origin`/`Referer` must match a
verified project domain. Body:

```json
{
  "project": "sig_pk_xxx",
  "sent_at": "2026-11-24T12:00:00Z",
  "events": [{
    "event_id": "uuid-from-client",
    "event": "page_view | custom | session_start | session_end | heartbeat | conversion",
    "visitor_id": "uuid", "session_id": "uuid",
    "occurred_at": "client hint (server time wins)",
    "properties": { "path": "/", "title": "…", "referrer": "…",
                    "utm_source": "…", "viewport": "…", "custom": {} }
  }]
}
```

Responses: `202 {accepted, duplicates}` · `400` bad schema · `403` unknown
key/unverified domain · `413` too large · `429` rate-limited.

### `GET /signal.js` — static tracker; `data-site-id="sig_pk_…"` boots it.

## Management (authenticated, org-scoped)

- `POST /api/v1/auth/register|login|logout|password-reset` · `GET /api/v1/auth/me`
- `GET|POST /api/v1/organizations` · `GET|PATCH /api/v1/organizations/:id`
- `GET|POST /api/v1/organizations/:id/members` · `PATCH|DELETE …/members/:uid` (owner/admin)
- `GET|POST /api/v1/projects` · `GET|PATCH|DELETE /api/v1/projects/:id`
- `POST /api/v1/projects/:id/domains` · `POST /api/v1/domains/:id/verify` · `DELETE /api/v1/domains/:id`
- `POST /api/v1/projects/:id/keys/rotate`
- `GET|POST /api/v1/projects/:id/event-definitions`

## Analytics (authenticated)

`GET /api/v1/analytics/:projectId/overview?from&to&country&device&source`
`GET /api/v1/analytics/:projectId/visitors?cursor&q`
`GET /api/v1/analytics/:projectId/visitors/:visitorId`
`GET /api/v1/analytics/:projectId/live` (SSE)
`GET /api/v1/analytics/:projectId/geo|devices|sources|pages|events|funnels`
`GET /api/v1/analytics/:projectId/export?format=csv`
`GET /api/v1/analytics/org/:orgId/overview` (cross-site rollup)

## Errors

`{error: {code, message}}` — codes: `unauthorized, forbidden, not_found,
validation_failed, rate_limited, conflict, server_error`.
