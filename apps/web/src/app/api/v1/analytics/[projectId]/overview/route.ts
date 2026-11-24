import { route, ok } from "@/lib/api";
import { requireUser, assertProjectAccess } from "@/lib/auth";
import { overview, rangeFrom, filtersFrom } from "@/lib/analytics";

type Ctx = { params: Promise<{ projectId: string }> };

export const GET = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { projectId } = await ctx.params;
  const { orgId } = await assertProjectAccess(projectId, s);
  const q = new URL(req.url).searchParams;
  return ok(await overview(projectId, orgId, rangeFrom(q), filtersFrom(q)));
});
