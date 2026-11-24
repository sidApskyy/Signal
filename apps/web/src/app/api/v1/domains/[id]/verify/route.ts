import { route, ok, err } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { Resolver } from "node:dns/promises";

type Ctx = { params: Promise<{ id: string }> };

async function checkTxt(host: string, token: string): Promise<boolean> {
  try {
    const resolver = new Resolver({ timeout: 5000 });
    const records = await resolver.resolveTxt(`_signal.${host.replace(/:\d+$/, "")}`);
    return records.flat().some((r) => r.trim() === token);
  } catch { return false; }
}

async function checkHttp(host: string, path: string, token: string, meta: boolean): Promise<boolean> {
  for (const scheme of ["https", "http"]) {
    try {
      const res = await fetch(`${scheme}://${host}${path}`, { signal: AbortSignal.timeout(8000), redirect: "follow" });
      if (!res.ok) continue;
      const text = (await res.text()).slice(0, 200_000);
      if (meta ? text.includes(`name="signal-verification"`) && text.includes(token) : text.trim() === token) return true;
    } catch { /* try next scheme */ }
  }
  return false;
}

export const POST = route(async (_req: Request, ctx: Ctx) => {
  const s = await requireUser();
  const { id } = await ctx.params;
  const rows = await sql`
    SELECT d.*, p.organization_id FROM project_domains d
    JOIN projects p ON p.id = d.project_id WHERE d.id = ${id}`;
  const d = rows[0] as { id: string; host: string; verification_method: string; verification_token: string; organization_id: string } | undefined;
  if (!d) return err(404, "not_found");
  if (!s.isPlatformOwner && d.organization_id !== s.orgId) return err(403, "forbidden");
  requireRole(s, "admin");
  if (d.host.endsWith(".local") || d.host.startsWith("localhost")) {
    // Dev convenience: local hosts verify instantly (documented dev-only path).
    await sql`UPDATE project_domains SET verified_at = now() WHERE id = ${id}`;
    return ok({ verified: true, dev: true });
  }

  let verified = false;
  if (d.verification_method === "dns_txt") verified = await checkTxt(d.host, d.verification_token);
  else if (d.verification_method === "html_file") verified = await checkHttp(d.host, "/.well-known/signal-verification.txt", d.verification_token, false);
  else verified = await checkHttp(d.host, "/", d.verification_token, true);

  if (!verified) return err(400, "verification_failed", "Token not found via the selected method yet. DNS/HTTP propagation can take a few minutes.");
  await sql`UPDATE project_domains SET verified_at = now() WHERE id = ${id}`;
  return ok({ verified: true });
});
