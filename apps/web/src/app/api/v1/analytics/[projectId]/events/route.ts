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
  const [names, recent] = await Promise.all([
    sql`SELECT name, count(*) AS count, count(DISTINCT visitor_id) AS visitors,
               max(occurred_at) AS last_seen
        FROM events WHERE project_id=${projectId} AND organization_id=${orgId}
          AND occurred_at BETWEEN ${r.from} AND ${r.to}
        GROUP BY name ORDER BY count DESC LIMIT 50`,
    sql`SELECT name, occurred_at, page_path, props, visitor_id
        FROM events WHERE project_id=${projectId} AND organization_id=${orgId}
        ORDER BY occurred_at DESC LIMIT 100`,
  ]);
  return ok({ names, recent });
});
