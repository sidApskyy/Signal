import { createDb, createRawClient } from "@signal/db";
import { env } from "./env";

// System connection (table owner): migrations, ingestion writes, auth.
export const db = createDb(env.databaseUrl);
export const sql = createRawClient(env.databaseUrl);

// Tenant connection (signal_app role): subject to Postgres RLS.
export const appSql = createRawClient(env.appDbUrl);

/**
 * Run `fn` inside a transaction with `app.org_id` set — the RLS context.
 * Every tenant-scoped read in management/analytics routes goes through this.
 */
export async function withOrg<T>(orgId: string, fn: (q: typeof appSql) => Promise<T>): Promise<T> {
  return appSql.begin(async (tx) => {
    await tx`SELECT set_config('app.org_id', ${orgId}, true)`;
    return fn(tx as unknown as typeof appSql);
  }) as Promise<T>;
}
