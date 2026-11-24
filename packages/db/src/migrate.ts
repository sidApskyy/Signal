import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL ?? "postgres://signal:signal_dev_password@localhost:5432/signal";
const here = dirname(fileURLToPath(import.meta.url));

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: join(here, "../drizzle") });

// Apply RLS policies (idempotent)
const rls = readFileSync(join(here, "rls.sql"), "utf8");
await client.unsafe(rls);

console.log("Migrations + RLS applied.");
await client.end();
