import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export type Db = ReturnType<typeof createDb>;

export function createDb(url?: string) {
  const client = postgres(url ?? process.env.DATABASE_URL ?? "postgres://signal:signal_dev_password@localhost:5432/signal", {
    max: 10,
    prepare: true,
  });
  return drizzle(client, { schema });
}

export function createRawClient(url?: string) {
  return postgres(url ?? process.env.DATABASE_URL ?? "postgres://signal:signal_dev_password@localhost:5432/signal", { max: 10 });
}
