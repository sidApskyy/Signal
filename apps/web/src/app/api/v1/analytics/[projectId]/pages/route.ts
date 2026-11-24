import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const r = rangeFrom(new URL(req.url).searchParams);
  const pages = await sql`
    SELECT path, count(*) AS views, count(DISTINCT visitor_id) AS visitors,
           avg(time_on_page_ms)::int AS avg_time_ms
    FROM page_views WHERE project_id=${projectId} AND organization_id=${orgId}
      AND occurred_at BETWEEN ${r.from} AND ${r.to}
    GROUP BY path ORDER BY views DESC LIMIT 50`;
  return ok({ pages });
});
