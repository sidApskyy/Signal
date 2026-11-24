import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

/** Funnel steps: array of {type: 'page'|'event', value} — computed via ordered-session SQL. */
const body = z.object({
  steps: z.array(z.object({ type: z.enum(["page", "event"]), value: z.string().min(1).max(500) })).min(2).max(8),
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const { steps } = body.parse(await req.json());
  const r = rangeFrom(new URL(req.url).searchParams);

  // For each step, count sessions that hit it after hitting all previous steps (ordered within session).
  const results: { step: string; sessions: number; dropoff: number }[] = [];
  let eligible: string[] | null = null; // session ids passing prior steps
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const rows: { session_id: string }[] = (st.type === "page"
      ? await sql`SELECT DISTINCT session_id FROM page_views
          WHERE project_id=${projectId} AND organization_id=${orgId}
            AND path=${st.value} AND occurred_at BETWEEN ${r.from} AND ${r.to}
            ${eligible ? sql`AND session_id::text = ANY(${eligible})` : sql``}`
      : await sql`SELECT DISTINCT session_id FROM events
          WHERE project_id=${projectId} AND organization_id=${orgId}
            AND name=${st.value} AND occurred_at BETWEEN ${r.from} AND ${r.to}
            ${eligible ? sql`AND session_id::text = ANY(${eligible})` : sql``}`) as unknown as { session_id: string }[];
    const ids: string[] = rows.map((x) => x.session_id);
    const prev = results.length ? results[results.length - 1].sessions : ids.length;
    results.push({ step: `${st.type}:${st.value}`, sessions: ids.length, dropoff: prev ? 1 - ids.length / prev : 0 });
    eligible = ids;
  }
  return ok({ steps: results });
});
