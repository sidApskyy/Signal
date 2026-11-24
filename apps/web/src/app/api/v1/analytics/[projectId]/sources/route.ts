import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { breakdown, rangeFrom } from "@/lib/analytics";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const r = rangeFrom(new URL(req.url).searchParams);
  const [channels, sources, mediums, campaigns, referrers] = await Promise.all([
    breakdown(projectId, orgId, r, "channel"),
    breakdown(projectId, orgId, r, "utm_source"),
    breakdown(projectId, orgId, r, "utm_medium"),
    breakdown(projectId, orgId, r, "utm_campaign"),
    breakdown(projectId, orgId, r, "referrer_host"),
  ]);
  const landing = await sql`
    SELECT entry_page AS value, count(*) AS sessions, count(DISTINCT visitor_id) AS visitors
    FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
      AND last_seen_at BETWEEN ${r.from} AND ${r.to} AND entry_page IS NOT NULL
    GROUP BY 1 ORDER BY sessions DESC LIMIT 30`;
  return ok({ channels, sources, mediums, campaigns, referrers, landing });
});
