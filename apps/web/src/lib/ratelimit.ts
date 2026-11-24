import { env } from "./env";

/** Token bucket per key: Redis when configured, else in-memory (per-instance). */
interface Bucket { tokens: number; ts: number }
const local = new Map<string, Bucket>();

let redis: import("ioredis").Redis | null = null;
async function getRedis() {
  if (redis || !env.redisUrl) return redis;
  try {
    const { default: Redis } = await import("ioredis");
    redis = new Redis(env.redisUrl, { lazyConnect: false, maxRetriesPerRequest: 1 });
    redis.on("error", () => { redis = null; });
  } catch { redis = null; }
  return redis;
}

export async function rateLimit(key: string, limit = env.rateLimitPerMinute): Promise<boolean> {
  const r = await getRedis();
  if (r) {
    try {
      const n = await r.incr(`rl:${key}`);
      if (n === 1) await r.expire(`rl:${key}`, 60);
      return n <= limit;
    } catch { /* fall through to memory */ }
  }
  const now = Date.now();
  const b = local.get(key) ?? { tokens: limit, ts: now };
  const refill = ((now - b.ts) / 60000) * limit;
  b.tokens = Math.min(limit, b.tokens + refill);
  b.ts = now;
  if (b.tokens < 1) { local.set(key, b); return false; }
  b.tokens--; local.set(key, b);
  return true;
}
