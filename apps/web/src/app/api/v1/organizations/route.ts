import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireUser, listMemberships } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, organizationMembers } from "@signal/db";

export const GET = route(async () => {
  const s = await requireUser();
  const orgs = await listMemberships(s.userId);
  return ok({ organizations: orgs.map((o) => ({ ...o.org, role: o.role })) });
});

const body = z.object({ name: z.string().min(1).max(120) });

export const POST = route(async (req: Request) => {
  const s = await requireUser();
  const { name } = body.parse(await req.json());
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  const [org] = await db.insert(organizations).values({ name, slug }).returning();
  await db.insert(organizationMembers).values({ organizationId: org.id, userId: s.userId, role: "owner", acceptedAt: new Date() });
  return ok(org, 201);
});
