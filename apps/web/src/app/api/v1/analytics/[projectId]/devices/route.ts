import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { breakdown, rangeFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const r = rangeFrom(new URL(req.url).searchParams);
  const [categories, browsers, os] = await Promise.all([
    breakdown(projectId, orgId, r, "device_category"),
    breakdown(projectId, orgId, r, "browser"),
    breakdown(projectId, orgId, r, "os"),
  ]);
  return ok({ categories, browsers, os });
});
