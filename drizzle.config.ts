import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://javeroo:javeroo_dev@localhost:5432/javeroo_dev",
  },
  strict: true,
  verbose: true,
});

