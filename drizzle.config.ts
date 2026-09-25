import { defineConfig } from "drizzle-kit";

const user = process.env.USER || process.env.LOGNAME || "postgres";
const url = process.env.DATABASE_URL ?? `postgresql://${user}@127.0.0.1:5432/bluecotton`;

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
