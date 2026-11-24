# SIGNAL — Security & Privacy

## Security controls

- **Auth**: scrypt/bcrypt password hashing, httpOnly `Secure` `SameSite=Lax`
  session cookies, DB-backed sessions with rotation, optional TOTP MFA,
  password reset + email verification via single-use hashed tokens.
- **Authorization**: role checks (platform_owner > owner > admin > analyst >
  viewer) enforced in server route handlers; UI hiding is cosmetic only.
- **Tenant isolation**: Postgres RLS keyed by `app.org_id` set inside the
  transaction; org/project IDs from the client are never authorization input.
- **Ingestion hardening**: public key (non-secret) + verified-domain origin
  check + Zod schema + 64 KB payload cap + per-key/IP rate limits +
  idempotent `event_id` dedup + server-side timestamps.
- **Web**: CSP, XSS-safe rendering (React escaping, no dangerouslySetInnerHTML
  on user data), CSRF-safe mutations (SameSite + JSON content-type checks),
  parameterized queries only (Drizzle).
- **Ops**: secret management via env, audit logs for admin actions, project
  key rotation, encrypted backups, secure deletion workflows.

## Privacy controls

- First-party anonymous IDs only. **No** canvas/device fingerprinting, no
  covert tracking, no bypassing privacy settings.
- IP addresses used at ingest for geo classification then discarded; only
  truncated /24 kept when `keep_network_prefix` is enabled.
- Consent modes per project: `required` (no tracking until grant),
  `anonymous` (cookieless counting), `off`.
- Data minimization: no form field contents, passwords, or sensitive inputs —
  ever. Configurable sensitive-URL exclusion patterns.
- Retention per project (`retention_days`); DSAR workflows: visitor export +
  deletion by anonymous visitor_id.
- Designed for India's DPDP Act and GDPR-aligned processing: consent records,
  purpose limitation, breach-supporting audit trail.
- Geo results displayed as *approximate* — never exact physical location;
  confidence caveats shown in UI.
