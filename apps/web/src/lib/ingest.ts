import { z } from "zod";
import { sql } from "./db";
import { parseDevice } from "./engines/device";
import { lookupGeo } from "./engines/geo";
import { classifyBot } from "./engines/bot";

export const eventSchema = z.object({
  event_id: z.string().min(8).max(64),
  event: z.enum(["page_view", "session_start", "session_end", "heartbeat", "custom", "conversion"]),
  visitor_id: z.string().min(8).max(64),
  session_id: z.string().min(8).max(64),
  occurred_at: z.string().max(40).optional(), // hint only — server time wins
  properties: z.record(z.unknown()).optional(),
});

export const batchSchema = z.object({
  project: z.string().regex(/^sig_pk_[a-z0-9]+$/i),
  sent_at: z.string().optional(),
  events: z.array(eventSchema).min(1).max(50),
});

export type Batch = z.infer<typeof batchSchema>;

const SYSTEM_PROPS = new Set(["ip", "country_code", "country", "city", "region", "organization_id", "project_id", "occurred_at", "server_time"]);
export function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (SYSTEM_PROPS.has(k.toLowerCase())) continue; // clients can't overwrite system fields
    if (typeof v === "string") out[k] = v.slice(0, 1000);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = JSON.parse(JSON.stringify(v).slice(0, 2000));
    }
  }
  return out;
}

export interface ProjectResolution {
  projectId: string; orgId: string; consentMode: string; hosts: string[];
}

export async function resolveProject(publicKey: string): Promise<ProjectResolution | null> {
  const rows = await sql`
    SELECT p.id, p.organization_id, p.consent_mode,
           COALESCE(array_agg(d.host) FILTER (WHERE d.verified_at IS NOT NULL), '{}') AS hosts
    FROM project_keys k
    JOIN projects p ON p.id = k.project_id
    LEFT JOIN project_domains d ON d.project_id = p.id
    WHERE k.public_key = ${publicKey} AND k.revoked_at IS NULL
    GROUP BY p.id`;
  const r = rows[0] as { id: string; organization_id: string; consent_mode: string; hosts: string[] } | undefined;
  if (!r) return null;
  return { projectId: r.id, orgId: r.organization_id, consentMode: r.consent_mode, hosts: r.hosts };
}

/** Origin/Referer host must be a verified domain (or the request carries none — e.g. curl is rejected for prod). */
export function hostAllowed(hosts: string[], origin: string | null, referer: string | null): boolean {
  if (!hosts.length) return false;
  const candidates: string[] = [];
  for (const raw of [origin, referer]) {
    if (!raw) continue;
    try { candidates.push(new URL(raw).host); } catch { /* malformed */ }
  }
  if (!candidates.length) return false;
  return candidates.some((h) => hosts.some((v) => h === v || h.endsWith(`.${v}`)));
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

interface ProcessedSession { sessionDbId: string; visitorDbId: string; }

export async function upsertVisitor(p: ProjectResolution, vid: string, meta: {
  country?: string | null; region?: string | null; city?: string | null;
  device?: string | null; browser?: string | null; os?: string | null;
}, now: Date): Promise<string> {
  const rows = await sql`
    INSERT INTO visitors (organization_id, project_id, visitor_id, first_seen_at, last_seen_at,
      country_code, region, city, device_category, browser, os)
    VALUES (${p.orgId}, ${p.projectId}, ${vid}, ${now}, ${now},
      ${meta.country ?? null}, ${meta.region ?? null}, ${meta.city ?? null},
      ${meta.device ?? null}, ${meta.browser ?? null}, ${meta.os ?? null})
    ON CONFLICT (project_id, visitor_id) DO UPDATE SET
      last_seen_at = EXCLUDED.last_seen_at,
      country_code = COALESCE(EXCLUDED.country_code, visitors.country_code),
      device_category = COALESCE(EXCLUDED.device_category, visitors.device_category),
      browser = COALESCE(EXCLUDED.browser, visitors.browser)
    RETURNING id`;
  return (rows[0] as { id: string }).id;
}

export async function upsertSession(p: ProjectResolution, visitorDbId: string, clientSid: string, meta: {
  country?: string | null; region?: string | null; city?: string | null;
  device?: string | null; browser?: string | null; os?: string | null;
  channel?: string | null; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null;
  referrerHost?: string | null; entryPage?: string | null; bot?: string;
}, now: Date): Promise<ProcessedSession> {
  const rows = await sql`
    INSERT INTO sessions (organization_id, project_id, visitor_id, client_session_id,
      started_at, last_seen_at, entry_page, channel, utm_source, utm_medium, utm_campaign,
      referrer_host, country_code, region, city, device_category, browser, os, bot_class)
    VALUES (${p.orgId}, ${p.projectId}, ${visitorDbId}, ${clientSid}, ${now}, ${now},
      ${meta.entryPage ?? null}, ${meta.channel ?? null}, ${meta.utmSource ?? null},
      ${meta.utmMedium ?? null}, ${meta.utmCampaign ?? null}, ${meta.referrerHost ?? null},
      ${meta.country ?? null}, ${meta.region ?? null}, ${meta.city ?? null},
      ${meta.device ?? null}, ${meta.browser ?? null}, ${meta.os ?? null},
      ${meta.bot ?? "human"}::bot_class)
    ON CONFLICT (project_id, client_session_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at
    RETURNING id, visitor_id`;
  const r = rows[0] as { id: string; visitor_id: string };
  return { sessionDbId: r.id, visitorDbId: r.visitor_id };
}

export function extractMeta(props: Record<string, unknown>) {
  const s = (k: string) => (typeof props[k] === "string" ? (props[k] as string).slice(0, 500) : null);
  let referrerHost: string | null = null;
  const ref = s("referrer");
  if (ref) { try { referrerHost = new URL(ref).host; } catch { /* malformed */ } }
  return {
    path: s("path"), title: s("title"), referrer: ref, referrerHost,
    channel: s("channel"), utmSource: s("utm_source"), utmMedium: s("utm_medium"),
    utmCampaign: s("utm_campaign"), viewport: s("viewport"), screen: s("screen"),
  };
}

export { parseDevice, lookupGeo, classifyBot };
