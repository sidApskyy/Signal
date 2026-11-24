import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(status: number, code: string, message?: string) {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status });
}

/** Wrap a route handler: uniform error mapping. */
export function route<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) return err(e.status, e.message);
      if (e instanceof ZodError) return err(400, "validation_failed", e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      console.error("[api]", e);
      return err(500, "server_error");
    }
  };
}
