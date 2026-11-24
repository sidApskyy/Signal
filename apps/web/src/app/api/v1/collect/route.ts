import { route, ok, err } from "@/lib/api";
import { env } from "@/lib/env";
import {
  batchSchema, resolveProject, hostAllowed, sanitizeProps,
  extractMeta, upsertVisitor, upsertSession, clientIp,
  parseDevice, lookupGeo, classifyBot,
} from "@/lib/ingest";
import { rateLimit } from "@/lib/ratelimit";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export const OPTIONS = () => new Response(null, { status: 204 });

export const POST = route(async (req: Request) => {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > env.maxPayloadBytes) return err(413, "payload_too_large");

  const ip = clientIp(req);
  if (!(await rateLimit(`ip:${ip ?? "unknown"}`, env.rateLimitPerMinute))) return err(429, "rate_limited");

  const body = batchSchema.parse(await req.json());
  if (!(await rateLimit(`pk:${body.project}`, env.rateLimitPerMinute * 4))) return err(429, "rate_limited");

  const project = await resolveProject(body.project);
  if (!project) return err(403, "unknown_project");

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  if (!hostAllowed(project.hosts, origin, referer)) return err(403, "unverified_domain");

  const ua = req.headers.get("user-agent");
  const device = parseDevice(ua);
  const bot = classifyBot(ua);
  const geo = await lookupGeo(ip);
  const now = new Date();

  let accepted = 0, duplicates = 0;
  const sessionCache = new Map<string, { sessionDbId: string; visitorDbId: string }>();
  const visitorCache = new Map<string, string>();

  for (const e of body.events) {
    const meta = {
      country: geo.countryCode, region: geo.region, city: geo.city,
      device: device.deviceCategory, browser: device.browser, os: device.os,
    };

    let visitorDbId = visitorCache.get(e.visitor_id);
    if (!visitorDbId) {
      visitorDbId = await upsertVisitor(project, e.visitor_id, meta, now);
      visitorCache.set(e.visitor_id, visitorDbId);
    }

    let sess = sessionCache.get(e.session_id);
    if (!sess) {
      const props = sanitizeProps(e.properties);
      const m = extractMeta(props);
      sess = await upsertSession(project, visitorDbId, e.session_id, {
        ...meta, channel: m.channel ?? props.channel as string | null,
        utmSource: m.utmSource, utmMedium: m.utmMedium, utmCampaign: m.utmCampaign,
        referrerHost: m.referrerHost, entryPage: m.path, bot,
      }, now);
      sessionCache.set(e.session_id, sess);
    }

    const props = sanitizeProps(e.properties);
    const m = extractMeta(props);

    if (e.event === "page_view") {
      await sql`
        INSERT INTO page_views (organization_id, project_id, session_id, visitor_id, path, title, occurred_at)
        VALUES (${project.orgId}, ${project.projectId}, ${sess.sessionDbId}, ${sess.visitorDbId},
          ${m.path ?? "/"}, ${m.title}, ${now})
        ON CONFLICT DO NOTHING`;
      await sql`UPDATE sessions SET page_count = page_count + 1, exit_page = ${m.path ?? null},
        duration_s = GREATEST(duration_s, EXTRACT(EPOCH FROM (${now}::timestamptz - started_at))::int)
        WHERE id = ${sess.sessionDbId}`;
    } else if (e.event === "heartbeat") {
      await sql`UPDATE sessions SET last_seen_at = ${now} WHERE id = ${sess.sessionDbId}`;
    } else if (e.event === "session_end") {
      await sql`UPDATE sessions SET ended_at = ${now}, exit_page = ${m.path} WHERE id = ${sess.sessionDbId}`;
    } else {
      // custom / conversion / session_start — dedup on client event_id
      const ins = await sql`
        INSERT INTO events (organization_id, project_id, session_id, visitor_id, client_event_id, name, occurred_at, page_path, props)
        VALUES (${project.orgId}, ${project.projectId}, ${sess.sessionDbId}, ${sess.visitorDbId},
          ${e.event_id}, ${e.event === "custom" ? String(props.name ?? "custom").slice(0, 120) : e.event},
          ${now}, ${m.path}, ${JSON.stringify(props)})
        ON CONFLICT (project_id, client_event_id) DO NOTHING
        RETURNING id`;
      if (ins.length === 0) { duplicates++; continue; }
      await sql`UPDATE sessions SET event_count = event_count + 1 WHERE id = ${sess.sessionDbId}`;
    }
    accepted++;
  }

  return ok({ accepted, duplicates }, 202);
});
