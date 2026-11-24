# SIGNAL — Product Specification

**Universal Website Visitor Intelligence · By RDCS GENIX**

## Vision

A self-hosted, multi-tenant website analytics and visitor-intelligence platform
installed on any website via a lightweight first-party JavaScript tracker.
Independent of external analytics SaaS (no Google Analytics, PostHog, Matomo,
Mixpanel, Segment, ZoomInfo).

## Tenant model

```
PLATFORM
└── Organizations
    ├── Members (roles: owner, admin, analyst, viewer; plus platform_owner)
    └── Projects (websites)
        ├── Verified domains (production / staging / development)
        ├── Project keys (public tracking key, rotatable)
        ├── Visitors → Sessions → Events / Page views
        ├── Attribution, consent records, analytics, reports
```

- One organization → many websites. One website → isolated config + data.
- Isolation enforced at DB (PostgreSQL RLS), API, cache, worker, and report layers.
- Browser-supplied org/project IDs are never trusted for authorization.

## Capabilities

- Website registration + domain ownership verification (DNS TXT, HTML file, meta tag)
- Unique per-project public tracking key + installation wizard
- Anonymous visitor profiles, sessions, journeys, live visitors
- Approximate geolocation (local licensed GeoIP DB only — never an external API),
  device/browser/OS intelligence, traffic-source & campaign attribution
- Custom events, funnels, conversion tracking, configurable engagement scoring
- Cross-website organization analytics, comparisons, CSV exports, saved reports
- Consent-aware tracking, data minimization, retention controls, audit logs

## Roles

| Role | Scope |
|---|---|
| Platform owner | Whole platform: orgs, projects, health, config |
| Organization owner | Everything in the org incl. billing/deletion |
| Organization admin | Projects, members, settings |
| Analyst | Dashboards, reports, exports |
| Viewer | Read-only dashboards |

Enforced server-side on every request, not merely hidden in the UI.

## Non-goals (v1)

- No third-party analytics integrations, no invasive fingerprinting,
  no Kafka/Kubernetes/ClickHouse (interfaces allow later adoption),
  no identifying anonymous visitors as real persons.
