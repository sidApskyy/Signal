import { z } from "zod";
import { route, ok, err } from "@/lib/api";
import { db } from "@/lib/db";
import { users } from "@signal/db";
import { eq } from "drizzle-orm";
import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const body = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = route(async (req: Request) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await rateLimit(`login:${ip}`, 20))) return err(429, "rate_limited");
  const { email, password } = body.parse(await req.json());
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user || !verifyPassword(password, user.passwordHash)) return err(401, "invalid_credentials");
  const token = await createSession(user.id, ip, req.headers.get("user-agent") ?? undefined);
  await setSessionCookie(token);
  return ok({ id: user.id, email: user.email, name: user.name });
});
