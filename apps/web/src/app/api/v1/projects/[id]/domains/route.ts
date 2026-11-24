import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireUser, requireRole, assertProjectAccess } from "@/lib/auth";
import { sql } from "@/lib/db";
import { randomUUID } from "node:crypto";

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({
  host: z.string().min(1).max(253).regex(/^[a-z0-9.-]+(?::\d+)?$/i),
  environment: z.enum(["production", "staging", "development"]).default("production"),
  method: z.enum(["dns_txt", "html_file", "meta_tag"]).default("dns_txt"),
});

export const POST = route(async (req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const { orgId } = await assertProjectAccess(id, s);
  requireRole(s, "admin");
  const input = body.parse(await req.json());
  const token = `sig_verify_${randomUUID()}`;
  const [domain] = await sql`
    INSERT INTO project_domains (organization_id, project_id, host, environment, verification_method, verification_token)
    VALUES (${orgId}, ${id}, ${input.host.toLowerCase()}, ${input.environment}, ${input.method}, ${token})
    ON CONFLICT (project_id, host) DO UPDATE SET verification_token = EXCLUDED.verification_token,
      verification_method = EXCLUDED.verification_method
    RETURNING *`;
  return ok({ domain, instructions: instructions(input.method, input.host, token) }, 201);
});

function instructions(method: string, host: string, token: string) {
  if (method === "dns_txt") return { type: "dns_txt", host: `_signal.${host}`, value: token, hint: `Add TXT record _signal.${host} = ${token}` };
  if (method === "html_file") return { type: "html_file", path: `/.well-known/signal-verification.txt`, value: token, hint: `Serve ${token} at https://${host}/.well-known/signal-verification.txt` };
  return { type: "meta_tag", name: "signal-verification", value: token, hint: `Add <meta name="signal-verification" content="${token}"> to the homepage head` };
}
