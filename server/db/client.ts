import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/server/db/schema";

function loadEnvFile() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.USER || process.env.LOGNAME || "postgres";
  return `postgresql://${user}@127.0.0.1:5432/bluecotton`;
}

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
  drizzle?: ReturnType<typeof drizzle<typeof schema>>;
};

function client() {
  if (!globalForDb.pg) {
    globalForDb.pg = postgres(databaseUrl(), { max: 8 });
  }
  return globalForDb.pg;
}

export function getDb() {
  if (!globalForDb.drizzle) {
    globalForDb.drizzle = drizzle(client(), { schema });
  }
  return globalForDb.drizzle;
}

export { schema };
