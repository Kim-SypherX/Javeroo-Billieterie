import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __javerooPgPool: Pool | undefined;
}

export function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!globalThis.__javerooPgPool) {
    globalThis.__javerooPgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 2_000,
    });
  }
  return globalThis.__javerooPgPool;
}

export function getDb() {
  const pool = getPgPool();
  if (!pool) {
    return null;
  }
  return drizzle(pool, { schema });
}

export { schema };

