import { route, ok, err } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { orgOverview, rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ orgId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { orgId: raw } = await ctx.params;
  const orgId = raw === "current" ? s.orgId : raw;
  if (!orgId || (!s.isPlatformOwner && orgId !== s.orgId)) return err(403, "forbidden");
  return ok(await orgOverview(orgId, rangeFrom(new URL(req.url).searchParams)));
});
