# SIGNAL — Deployment Guide

## Development

```bash
cp .env.example .env
npm install
npm run db:up          # postgres + redis (docker compose)
npm run db:migrate
npm run db:generate    # after schema changes
npm run seed           # demo org/project/test data (clearly labeled)
npm run sdk:build      # tracker → apps/web/public/signal.js
npm run dev            # http://localhost:3000
```

## Production (Linux VPS)

1. Provision Postgres 16 + Redis 7 (or compose on one host behind Nginx).
2. `npm ci && npm run build && npm run db:migrate`.
3. Serve `apps/web` with `next start -p 3000` under a process manager (systemd unit provided below).
4. Nginx terminates TLS, proxies `/` → Next.js, serves `/signal.js` with
   long-lived immutable cache headers, rate-limits `/api/v1/collect`.
5. Env: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (32+ bytes),
   `APP_URL`, `GEOIP_DB_PATH` (GeoLite2 .mmdb), backups via `pg_dump` cron
   to encrypted off-site storage.
6. The tracked website must never depend on SIGNAL: tracker loads `defer`,
   all failures swallowed — a SIGNAL outage cannot break customer sites.

### systemd unit (example)

```
[Service]
ExecStart=/usr/bin/npm run start -w @signal/web
WorkingDirectory=/opt/signal
EnvironmentFile=/opt/signal/.env
Restart=always
```

## Backup & recovery

- Nightly `pg_dump --format=custom`, 30-day retention, encrypted at rest.
- Restore drill: `pg_restore` into staging DB; documented RPO = 24 h.
