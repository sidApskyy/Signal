import { route, ok, err } from "@/lib/api";
import { requireUser, listMemberships } from "@/lib/auth";
import { cookies } from "next/headers";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const orgs = await listMemberships(s.userId);
  if (!orgs.some((o) => o.org.id === id) && !s.isPlatformOwner) return err(403, "forbidden");
  const jar = await cookies();
  jar.set("sig_org", id, { path: "/", sameSite: "lax" });
  jar.delete("sig_project");
  return ok({ ok: true });
});
