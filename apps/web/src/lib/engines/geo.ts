import { env } from "../env";

/**
 * Geo engine — local MaxMind GeoLite2 (.mmdb) when GEOIP_DB_PATH is set,
 * else a deterministic fallback marking results unknown. Never an external API.
 * Results are approximate; UI labels them as such.
 */
export interface GeoResult { countryCode: string | null; region: string | null; city: string | null; }

let reader: { get(ip: string): { country?: { iso_code?: string }; subdivisions?: { name?: string }[]; city?: { names?: { en?: string } } } | null } | null = null;
let tried = false;

async function getReader() {
  if (tried) return reader;
  tried = true;
  if (!env.geoipDbPath) return null;
  try {
    // Optional dependency — loaded only when a local GeoIP db is configured.
    const specifier = "maxmind"; // variable specifier: no static resolution
    const m = await import(/* webpackIgnore: true */ specifier).catch(() => null) as
      { default: { open(p: string): Promise<typeof reader> } } | null;
    if (m) reader = await m.default.open(env.geoipDbPath);
  } catch { reader = null; }
  return reader;
}

// RFC1918 / loopback / link-local — no geo.
function isPrivate(ip: string) {
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80)/.test(ip);
}

const cache = new Map<string, GeoResult>();

export async function lookupGeo(ip: string | null): Promise<GeoResult> {
  if (!ip || isPrivate(ip)) return { countryCode: null, region: null, city: null };
  const net = ip.split(".").slice(0, 3).join(".");
  const hit = cache.get(net);
  if (hit) return hit;
  const r = await getReader();
  let out: GeoResult = { countryCode: null, region: null, city: null };
  if (r) {
    const g = r.get(ip);
    if (g) out = {
      countryCode: g.country?.iso_code ?? null,
      region: g.subdivisions?.[0]?.name ?? null,
      city: g.city?.names?.en ?? null,
    };
  }
  cache.set(net, out);
  if (cache.size > 50000) cache.clear();
  return out;
}
