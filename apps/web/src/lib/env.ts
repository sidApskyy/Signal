export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://signal:signal_dev_password@localhost:5432/signal",
  appDbUrl: process.env.APP_DATABASE_URL ?? "postgres://signal_app:signal_app_dev_password@localhost:5432/signal",
  redisUrl: process.env.REDIS_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me",
  sessionCookie: process.env.SESSION_COOKIE_NAME ?? "signal_session",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  rateLimitPerMinute: Number(process.env.COLLECT_RATE_LIMIT_PER_MINUTE ?? 600),
  maxBatchEvents: Number(process.env.MAX_BATCH_EVENTS ?? 50),
  maxPayloadBytes: Number(process.env.MAX_PAYLOAD_BYTES ?? 65536),
  geoipDbPath: process.env.GEOIP_DB_PATH ?? "",
  publicRegistration: process.env.PUBLIC_REGISTRATION_ENABLED === "true",
} as const;
