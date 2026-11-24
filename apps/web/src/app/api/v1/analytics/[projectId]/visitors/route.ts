import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const q = new URL(req.url).searchParams;
  const r = rangeFrom(q);
  const search = q.get("q");
  const rows = await sql`
    SELECT id, visitor_id, first_seen_at, last_seen_at, session_count, pageview_count,
           event_count, country_code, region, city, device_category, browser, os,
           engagement_score, consent_status
    FROM visitors
    WHERE project_id=${projectId} AND organization_id=${orgId} AND last_seen_at BETWEEN ${r.from} AND ${r.to}
      AND (${search ?? null}::text IS NULL OR visitor_id ILIKE ${"%" + (search ?? "") + "%"} OR city ILIKE ${"%" + (search ?? "") + "%"})
    ORDER BY last_seen_at DESC LIMIT 200`;
  return ok({ visitors: rows });
});
