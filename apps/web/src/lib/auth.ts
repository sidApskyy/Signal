import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { authSessions, users, organizationMembers, organizations } from "@signal/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import { env } from "./env";

const SESSION_TTL_MS = 30 * 24 * 3600e3; // 30 days

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

const hashToken = (t: string) => createHash("sha256").update(t + env.sessionSecret).digest("hex");

export type Session = {
  userId: string; email: string; name: string; isPlatformOwner: boolean;
  orgId: string | null; role: "owner" | "admin" | "analyst" | "viewer" | null;
};

export async function createSession(userId: string, ip?: string, ua?: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(authSessions).values({
    userId, tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS), ip, userAgent: ua?.slice(0, 300),
  });
  return token;
}

export async function destroySession(token: string) {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
}

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(env.sessionCookie)?.value;
  if (!token) return null;
  const rows = await db
    .select({ u: users, m: organizationMembers })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(4);
  if (!rows.length) return null;
  const u = rows[0].u;
  const orgCookie = jar.get("sig_org")?.value;
  const member = rows.find((r) => r.m && r.m.organizationId === orgCookie)?.m ?? rows.find((r) => r.m)?.m ?? null;
  return {
    userId: u.id, email: u.email, name: u.name, isPlatformOwner: u.isPlatformOwner,
    orgId: member?.organizationId ?? null, role: member?.role ?? null,
  };
}

export async function requireUser(): Promise<Session> {
  const s = await currentSession();
  if (!s) throw new AuthError(401, "unauthorized");
  return s;
}

export async function requireOrg(): Promise<Session & { orgId: string }> {
  const s = await requireUser();
  if (!s.orgId) throw new AuthError(403, "no_organization");
  return s as Session & { orgId: string };
}

const ROLE_RANK = { viewer: 0, analyst: 1, admin: 2, owner: 3 } as const;
export function requireRole(s: Session, min: keyof typeof ROLE_RANK) {
  if (s.isPlatformOwner) return;
  if (s.role == null || ROLE_RANK[s.role] < ROLE_RANK[min]) throw new AuthError(403, "forbidden");
}

export async function assertProjectAccess(projectId: string, s: Session): Promise<{ orgId: string }> {
  const rows = await db.execute<{ organization_id: string }>(
    // eslint-disable-next-line
    (await import("drizzle-orm")).sql`SELECT organization_id FROM projects WHERE id = ${projectId} LIMIT 1`
  );
  const orgId = (rows as unknown as { organization_id: string }[])[0]?.organization_id;
  if (!orgId) throw new AuthError(404, "not_found");
  if (!s.isPlatformOwner && orgId !== s.orgId) throw new AuthError(403, "forbidden");
  return { orgId };
}

export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(env.sessionCookie, token, {
    httpOnly: true, sameSite: "lax", secure: env.appUrl.startsWith("https"),
    path: "/", maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function listMemberships(userId: string) {
  return db.select({ org: organizations, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId));
}
