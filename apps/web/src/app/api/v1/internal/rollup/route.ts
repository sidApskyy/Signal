import { route, ok, err } from "@/lib/api";
import { sql } from "@/lib/db";

/**
 * Internal rollup worker — recompute daily_aggregates for a date.
 * Invoke via cron: curl -X POST -H "x-internal-key: $INTERNAL_KEY" .../api/v1/internal/rollup?date=YYYY-MM-DD
 */
export const POST = route(async (req: Request) => {
  const key = req.headers.get("x-internal-key");
  if (!process.env.INTERNAL_KEY || key !== process.env.INTERNAL_KEY) return err(401, "unauthorized");
  const date = new URL(req.url).searchParams.get("date") ?? new Date(Date.now() - 86400e3).toISOString().slice(0, 10);

  await sql`DELETE FROM daily_aggregates WHERE date = ${date}`;

  // overall
  await sql`
    INSERT INTO daily_aggregates (project_id, organization_id, date, dimension, dimension_value, visitors, sessions, page_views, events)
    SELECT project_id, organization_id, ${date}, 'overall', 'all',
      count(DISTINCT visitor_id), count(*), 0, 0
    FROM sessions WHERE last_seen_at::date = ${date}::date GROUP BY project_id, organization_id`;
  await sql`
    UPDATE daily_aggregates d SET page_views = sub.c FROM (
      SELECT project_id, count(*) c FROM page_views WHERE occurred_at::date=${date}::date GROUP BY project_id
    ) sub WHERE d.project_id = sub.project_id AND d.date=${date} AND d.dimension='overall'`;
  await sql`
    UPDATE daily_aggregates d SET events = sub.c FROM (
      SELECT project_id, count(*) c FROM events WHERE occurred_at::date=${date}::date GROUP BY project_id
    ) sub WHERE d.project_id = sub.project_id AND d.date=${date} AND d.dimension='overall'`;

  // dimensional rollups
  for (const [dim, col] of [["country", "country_code"], ["device", "device_category"], ["source", "channel"]] as const) {
    await sql`
      INSERT INTO daily_aggregates (project_id, organization_id, date, dimension, dimension_value, visitors, sessions, page_views, events)
      SELECT project_id, organization_id, ${date}, ${dim}, COALESCE(${sql(col)}::text, 'unknown'),
        count(DISTINCT visitor_id), count(*), 0, 0
      FROM sessions WHERE last_seen_at::date=${date}::date
      GROUP BY project_id, organization_id, ${sql(col)}
      ON CONFLICT DO NOTHING`;
  }
  await sql`
    INSERT INTO daily_aggregates (project_id, organization_id, date, dimension, dimension_value, visitors, sessions, page_views, events)
    SELECT project_id, organization_id, ${date}, 'page', path, count(DISTINCT visitor_id), 0, count(*), 0
    FROM page_views WHERE occurred_at::date=${date}::date
    GROUP BY project_id, organization_id, path
    ON CONFLICT DO NOTHING`;

  // Retention sweep
  await sql`DELETE FROM events WHERE occurred_at < now() - (SELECT retention_days FROM projects p WHERE p.id = events.project_id) * interval '1 day'`;
  await sql`DELETE FROM page_views WHERE occurred_at < now() - (SELECT retention_days FROM projects p WHERE p.id = page_views.project_id) * interval '1 day'`;

  return ok({ date });
});
