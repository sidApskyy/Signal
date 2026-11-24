import { z } from "zod";
import { route, ok, err } from "@/lib/api";
import { db } from "@/lib/db";
import { users, organizations, organizationMembers } from "@signal/db";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";

const body = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10),
  name: z.string().min(1).max(120),
  organization: z.string().min(1).max(120).optional(),
});

export const POST = route(async (req: Request) => {
  if (!env.publicRegistration) {
    // Private beta: only the very first user (platform owner) may self-register.
    const count = await db.query.users.findFirst();
    if (count) return err(403, "registration_disabled");
  }
  const { email, password, name, organization } = body.parse(await req.json());
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return err(409, "email_taken");

  const isFirst = !(await db.query.users.findFirst());
  const [user] = await db.insert(users).values({
    email, name, passwordHash: hashPassword(password), isPlatformOwner: isFirst,
  }).returning();

  if (organization) {
    const slug = organization.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `org-${user.id.slice(0, 8)}`;
    const [org] = await db.insert(organizations).values({ name: organization, slug })
      .onConflictDoNothing().returning();
    if (org) {
      await db.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: "owner", acceptedAt: new Date() });
    }
  }
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return ok({ id: user.id, email: user.email }, 201);
});
