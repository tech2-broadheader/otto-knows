import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for the cloud (Supabase Postgres) schema. Generate
 * migrations from the schema with `pnpm --filter @otto/web db:generate`; apply
 * with `db:migrate` once DATABASE_URL points at your Supabase project.
 */
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/otto",
  },
});
