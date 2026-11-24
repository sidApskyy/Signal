import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireUser, requireRole, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({
  name: z.string().min(1).max(120).regex(/^[a-z0-9_]+$/),
  kind: z.enum(["custom", "conversion"]).default("custom"),
  propsSchema: z.record(z.unknown()).optional(),
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  requireRole(s, "admin");
  const input = body.parse(await req.json());
  const [def] = await sql`
    INSERT INTO event_definitions (organization_id, project_id, name, kind, props_schema)
    VALUES (${orgId}, ${id}, ${input.name}, ${input.kind}, ${input.propsSchema ? JSON.stringify(input.propsSchema) : null})
    ON CONFLICT (project_id, name) DO UPDATE SET kind = EXCLUDED.kind, props_schema = EXCLUDED.props_schema, enabled = true
    RETURNING *`;
  return ok(def, 201);
});
