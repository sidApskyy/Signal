import { z } from "zod";
import { route, ok } from "@/lib/api";
import { requireOrg, requireRole } from "@/lib/auth";
import { sql } from "@/lib/db";
import { randomBytes, randomUUID } from "node:crypto";

export const GET = route(async () => {
  const s = await requireOrg();
  const rows = await sql`
    SELECT p.*, k.public_key,
      (SELECT count(*) FROM visitors v WHERE v.project_id = p.id) AS visitors,
      (SELECT count(*) FROM sessions ss WHERE ss.project_id = p.id) AS sessions,
      (SELECT count(*) FROM page_views pv WHERE pv.project_id = p.id) AS pageviews
    FROM projects p
    LEFT JOIN project_keys k ON k.project_id = p.id AND k.revoked_at IS NULL
    WHERE p.organization_id = ${s.orgId} ORDER BY p.created_at`;
  return ok({ projects: rows });
});

const body = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  environment: z.enum(["production", "staging", "development"]).default("production"),
  timezone: z.string().max(60).default("UTC"),
});

export const POST = route(async (req: Request) => {
  const s = await requireOrg();
  requireRole(s, "admin");
  const input = body.parse(await req.json());
  const host = new URL(input.url).host;
  const publicKey = `sig_pk_${randomBytes(16).toString("hex")}`;
  const verificationToken = `sig_verify_${randomUUID()}`;

  const [project] = await sql`
    INSERT INTO projects (organization_id, name, url, environment, timezone)
    VALUES (${s.orgId}, ${input.name}, ${input.url}, ${input.environment}, ${input.timezone})
    RETURNING *`;
  const p = project as { id: string };
  await sql`INSERT INTO project_domains (organization_id, project_id, host, environment, verification_token)
    VALUES (${s.orgId}, ${p.id}, ${host}, ${input.environment}, ${verificationToken})`;
  await sql`INSERT INTO project_keys (organization_id, project_id, public_key)
    VALUES (${s.orgId}, ${p.id}, ${publicKey})`;
  return ok({ project, publicKey, verificationToken }, 201);
});
