import { z } from "zod";
import { route, ok, err } from "@/lib/api";
import { requireOrg, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, users, adminAuditLogs } from "@signal/db";
import { and, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireOrg();
  const { id } = await ctx.params;
  if (id !== s.orgId) return err(403, "forbidden");
  const rows = await db.select({
    id: organizationMembers.id, role: organizationMembers.role,
    userId: users.id, email: users.email, name: users.name, acceptedAt: organizationMembers.acceptedAt,
  }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, s.orgId));
  return ok({ members: rows });
});

const invite = z.object({ email: z.string().email().toLowerCase(), role: z.enum(["admin", "analyst", "viewer"]) });

export const POST = route(async (req: Request, ctx: Ctx) => {
  const s = await requireOrg();
  const { id } = await ctx.params;
  if (id !== s.orgId) return err(403, "forbidden");
  requireRole(s, "admin");
  const { email, role } = invite.parse(await req.json());
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) return err(404, "user_not_found");
  await db.insert(organizationMembers).values({
    organizationId: s.orgId, userId: user.id, role, invitedBy: s.userId, acceptedAt: new Date(),
  }).onConflictDoNothing();
  await db.insert(adminAuditLogs).values({ organizationId: s.orgId, actorId: s.userId, action: "member.invited", target: email, metadata: { role } });
  return ok({ ok: true }, 201);
});

const patch = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "analyst", "viewer"]) });

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const s = await requireOrg();
  const { id } = await ctx.params;
  if (id !== s.orgId) return err(403, "forbidden");
  requireRole(s, "owner");
  const { userId, role } = patch.parse(await req.json());
  await db.update(organizationMembers).set({ role })
    .where(and(eq(organizationMembers.organizationId, s.orgId), eq(organizationMembers.userId, userId)));
  return ok({ ok: true });
});
