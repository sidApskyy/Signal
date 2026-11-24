import { route, err } from "@/lib/api";
import { requireUser, requireRole, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

function csv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  requireRole(s, "analyst");
  const q = new URL(req.url).searchParams;
  const r = rangeFrom(q);
  const what = q.get("what") ?? "page_views";
  let rows: Record<string, unknown>[];
  if (what === "sessions") {
    rows = await sql`SELECT started_at, channel, utm_source, utm_medium, utm_campaign,
      country_code, device_category, browser, page_count, duration_s
      FROM sessions WHERE project_id=${projectId} AND organization_id=${orgId}
        AND last_seen_at BETWEEN ${r.from} AND ${r.to} ORDER BY started_at DESC LIMIT 50000`;
  } else if (what === "events") {
    rows = await sql`SELECT name, occurred_at, page_path, props
      FROM events WHERE project_id=${projectId} AND organization_id=${orgId}
        AND occurred_at BETWEEN ${r.from} AND ${r.to} ORDER BY occurred_at DESC LIMIT 50000`;
  } else {
    rows = await sql`SELECT path, title, occurred_at FROM page_views
      WHERE project_id=${projectId} AND organization_id=${orgId}
        AND occurred_at BETWEEN ${r.from} AND ${r.to} ORDER BY occurred_at DESC LIMIT 50000`;
  }
  return new Response(csv(rows as Record<string, unknown>[]), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="signal-${what}-${r.from.toISOString().slice(0, 10)}.csv"`,
    },
  }) as never;
});
