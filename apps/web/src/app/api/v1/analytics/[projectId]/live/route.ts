import { requireUser, assertProjectAccess } from "@/lib/auth";
import { liveVisitors } from "@/lib/live";
import { err } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const s = await requireUser();
    const { projectId } = await ctx.params;
    const { orgId } = await assertProjectAccess(projectId, s);

    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        let closed = false;
        req.signal.addEventListener("abort", () => { closed = true; try { controller.close(); } catch { /* done */ } });
        const tick = async () => {
          if (closed) return;
          try {
            const data = await liveVisitors(projectId, orgId);
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ at: new Date().toISOString(), visitors: data })}\n\n`));
          } catch { controller.enqueue(enc.encode(`event: error\ndata: {}\n\n`)); }
          if (!closed) setTimeout(tick, 5000);
        };
        controller.enqueue(enc.encode(`: connected\n\n`));
        await tick();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch {
    return err(401, "unauthorized");
  }
}
