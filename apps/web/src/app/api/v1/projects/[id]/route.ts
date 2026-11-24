import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireUser, requireRole, assertProjectAccess } from "@/lib/auth";
import { sql, withOrg } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  const data = await withOrg(orgId, async (q) => {
    const [project] = await q`SELECT * FROM projects WHERE id = ${id}`;
    const domains = await q`SELECT * FROM project_domains WHERE project_id = ${id} ORDER BY created_at`;
    const keys = await q`SELECT id, public_key, created_at, revoked_at FROM project_keys WHERE project_id = ${id} ORDER BY created_at DESC`;
    const defs = await q`SELECT * FROM event_definitions WHERE project_id = ${id}`;
    return { project, domains, keys, eventDefinitions: defs };
  });
  return ok(data);
});

const patch = z.object({
  name: z.string().min(1).max(200).optional(),
  timezone: z.string().max(60).optional(),
  retentionDays: z.number().int().min(7).max(3650).optional(),
  consentMode: z.enum(["required", "anonymous", "off"]).optional(),
  sensitivePathPatterns: z.array(z.string().max(200)).max(50).optional(),
  engagementWeights: z.record(z.number()).optional(),
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  requireRole(s, "admin");
  const input = patch.parse(await req.json());
  await withOrg(orgId, async (q) => {
    await q`UPDATE projects SET
      name = COALESCE(${input.name ?? null}, name),
      timezone = COALESCE(${input.timezone ?? null}, timezone),
      retention_days = COALESCE(${input.retentionDays ?? null}, retention_days),
      consent_mode = COALESCE(${input.consentMode ?? null}::consent_mode, consent_mode),
      sensitive_path_patterns = COALESCE(${input.sensitivePathPatterns ?? null}, sensitive_path_patterns),
      engagement_weights = COALESCE(${input.engagementWeights ? JSON.stringify(input.engagementWeights) : null}::jsonb, engagement_weights)
      WHERE id = ${id}`;
  });
  return ok({ ok: true });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  requireRole(s, "owner");
  await sql`DELETE FROM projects WHERE id = ${id} AND organization_id = ${orgId}`;
  return ok({ ok: true });
});
