import { route, ok } from "@/lib/api";
import { requireUser, requireRole, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { randomBytes } from "node:crypto";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  requireRole(s, "admin");
  const newKey = `sig_pk_${randomBytes(16).toString("hex")}`;
  await sql`UPDATE project_keys SET revoked_at = now(), rotated_at = now()
    WHERE project_id = ${id} AND revoked_at IS NULL`;
  await sql`INSERT INTO project_keys (organization_id, project_id, public_key)
    VALUES (${orgId}, ${id}, ${newKey})`;
  await sql`INSERT INTO admin_audit_logs (organization_id, actor_id, action, target)
    VALUES (${orgId}, ${s.userId}, 'project.key_rotated', ${id})`;
  return ok({ publicKey: newKey });
});
