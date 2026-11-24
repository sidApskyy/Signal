import { route, ok, err } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ projectId: string; visitorId: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId, visitorId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const [visitor] = await sql`SELECT * FROM visitors WHERE project_id=${projectId} AND organization_id=${orgId} AND id=${visitorId}`;
  if (!visitor) return err(404, "not_found");
  const sessions = await sql`
    SELECT * FROM sessions WHERE visitor_id=${visitorId} AND project_id=${projectId}
    ORDER BY started_at DESC LIMIT 50`;
  const timeline = await sql`
    SELECT * FROM (
      SELECT occurred_at AS ts, 'page_view' AS kind, path AS label, title AS detail, NULL::jsonb AS props
        FROM page_views WHERE visitor_id=${visitorId} AND project_id=${projectId}
      UNION ALL
      SELECT occurred_at AS ts, name AS kind, page_path AS label, NULL AS detail, props
        FROM events WHERE visitor_id=${visitorId} AND project_id=${projectId}
    ) t ORDER BY ts DESC LIMIT 300`;
  return ok({ visitor, sessions, timeline });
});
