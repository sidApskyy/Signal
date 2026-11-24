import { sql } from "./db";

export interface Range { from: Date; to: Date }
export function rangeFrom(q: URLSearchParams): Range {
  const to = q.get("to") ? new Date(q.get("to")!) : new Date();
  const days = Number(q.get("days") ?? 7);
  const from = q.get("from") ? new Date(q.get("from")!) : new Date(to.getTime() - days * 86400e3);
  return { from, to };
}

export interface Filters { country?: string; device?: string; source?: string }
export function filtersFrom(q: URLSearchParams): Filters {
  return { country: q.get("country") ?? undefined, device: q.get("device") ?? undefined, source: q.get("source") ?? undefined };
}

export async function overview(projectId: string, orgId: string, r: Range, f: Filters) {
  const rows = await sql`
    SELECT
      (SELECT count(DISTINCT visitor_id) FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
        AND last_seen_at BETWEEN ${r.from} AND ${r.to}
        AND (${f.country ?? null}::text IS NULL OR country_code=${f.country ?? null})
        AND (${f.device ?? null}::text IS NULL OR device_category=${f.device ?? null})
        AND (${f.source ?? null}::text IS NULL OR channel=${f.source ?? null})) AS visitors,
      (SELECT count(*) FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
        AND last_seen_at BETWEEN ${r.from} AND ${r.to}
        AND (${f.country ?? null}::text IS NULL OR country_code=${f.country ?? null})
        AND (${f.device ?? null}::text IS NULL OR device_category=${f.device ?? null})
        AND (${f.source ?? null}::text IS NULL OR channel=${f.source ?? null})) AS sessions,
      (SELECT count(*) FROM page_views WHERE project_id=${projectId} AND organization_id=${orgId}
        AND occurred_at BETWEEN ${r.from} AND ${r.to}) AS pageviews,
      (SELECT count(*) FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
        AND last_seen_at > now() - interval '90 seconds') AS live,
      (SELECT count(*) FROM sessions s WHERE project_id=${projectId} AND organization_id=${orgId}
        AND last_seen_at BETWEEN ${r.from} AND ${r.to}
        AND EXISTS (SELECT 1 FROM sessions s2 WHERE s2.visitor_id=s.visitor_id AND s2.started_at < s.started_at)) AS returning_sessions`;
  const timeseries = await sql`
    SELECT date_trunc('day', occurred_at)::date AS day, count(*) AS pageviews,
           count(DISTINCT session_id) AS sessions
    FROM page_views WHERE project_id=${projectId} AND organization_id=${orgId}
      AND occurred_at BETWEEN ${r.from} AND ${r.to}
    GROUP BY 1 ORDER BY 1`;
  const topPages = await sql`
    SELECT path, count(*) AS views, count(DISTINCT visitor_id) AS visitors
    FROM page_views WHERE project_id=${projectId} AND organization_id=${orgId}
      AND occurred_at BETWEEN ${r.from} AND ${r.to}
    GROUP BY path ORDER BY views DESC LIMIT 10`;
  return { totals: rows[0], timeseries, topPages };
}

export async function orgOverview(orgId: string, r: Range) {
  const projects = await sql`
    SELECT p.id, p.name, p.url,
      (SELECT count(DISTINCT visitor_id) FROM sessions s WHERE s.project_id=p.id AND s.last_seen_at BETWEEN ${r.from} AND ${r.to}) AS visitors,
      (SELECT count(*) FROM sessions s WHERE s.project_id=p.id AND s.last_seen_at BETWEEN ${r.from} AND ${r.to}) AS sessions,
      (SELECT count(*) FROM page_views pv WHERE pv.project_id=p.id AND pv.occurred_at BETWEEN ${r.from} AND ${r.to}) AS pageviews,
      (SELECT count(*) FROM sessions s WHERE s.project_id=p.id AND s.last_seen_at > now() - interval '90 seconds') AS live
    FROM projects p WHERE p.organization_id=${orgId} ORDER BY visitors DESC`;
  const totals = await sql`
    SELECT
      (SELECT count(DISTINCT visitor_id) FROM sessions WHERE organization_id=${orgId} AND last_seen_at BETWEEN ${r.from} AND ${r.to}) AS visitors,
      (SELECT count(*) FROM sessions WHERE organization_id=${orgId} AND last_seen_at BETWEEN ${r.from} AND ${r.to}) AS sessions,
      (SELECT count(*) FROM page_views WHERE organization_id=${orgId} AND occurred_at BETWEEN ${r.from} AND ${r.to}) AS pageviews,
      (SELECT count(*) FROM sessions WHERE organization_id=${orgId} AND last_seen_at > now() - interval '90 seconds') AS live`;
  const channels = await sql`
    SELECT channel, count(*) AS sessions FROM sessions
    WHERE organization_id=${orgId} AND last_seen_at BETWEEN ${r.from} AND ${r.to}
    GROUP BY channel ORDER BY sessions DESC`;
  const countries = await sql`
    SELECT country_code, count(DISTINCT visitor_id) AS visitors FROM sessions
    WHERE organization_id=${orgId} AND last_seen_at BETWEEN ${r.from} AND ${r.to} AND country_code IS NOT NULL
    GROUP BY country_code ORDER BY visitors DESC LIMIT 12`;
  return { totals: totals[0], projects, channels, countries };
}

export async function breakdown(projectId: string, orgId: string, r: Range, column: string) {
  const allowed = new Set(["country_code", "region", "city", "device_category", "browser", "os", "channel", "utm_source", "utm_medium", "utm_campaign", "referrer_host"]);
  if (!allowed.has(column)) throw new Error("bad_column");
  return sql`
    SELECT ${sql(column)} AS value, count(*) AS sessions, count(DISTINCT visitor_id) AS visitors
    FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
      AND last_seen_at BETWEEN ${r.from} AND ${r.to} AND ${sql(column)} IS NOT NULL
    GROUP BY 1 ORDER BY sessions DESC LIMIT 30`;
}
