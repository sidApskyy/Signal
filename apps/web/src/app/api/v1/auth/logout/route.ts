import { route, ok } from "@/lib/api";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { destroySession } from "@/lib/auth";

export const POST = route(async () => {
  const jar = await cookies();
  const token = jar.get(env.sessionCookie)?.value;
  if (token) await destroySession(token);
  jar.delete(env.sessionCookie);
  jar.delete("sig_org");
  jar.delete("sig_project");
  return ok({ ok: true });
});
