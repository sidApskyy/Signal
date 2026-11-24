import { route, ok, err } from "@/lib/api";
import { currentSession, listMemberships } from "@/lib/auth";

export const GET = route(async () => {
  const s = await currentSession();
  if (!s) return err(401, "unauthorized");
  const orgs = await listMemberships(s.userId);
  return ok({
    user: { id: s.userId, email: s.email, name: s.name, isPlatformOwner: s.isPlatformOwner },
    orgId: s.orgId, role: s.role,
    organizations: orgs.map((o) => ({ id: o.org.id, name: o.org.name, slug: o.org.slug, role: o.role })),
  });
});
