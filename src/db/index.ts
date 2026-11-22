import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __javerooPgPool: Pool | undefined;
}

function shouldUseSsl(connectionString: string): boolean {
  if (connectionString.includes("sslmode=disable")) return false;
  if (connectionString.includes("sslmode=require") || connectionString.includes("sslmode=verify")) {
    return true;
  }
  if (process.env.VERCEL === "1" && !connectionString.includes("localhost")) {
    return true;
  }
  return false;
}

export function getPgPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    return null;
  }
  if (!globalThis.__javerooPgPool) {
    const isServerless = process.env.VERCEL === "1";
    globalThis.__javerooPgPool = new Pool({
      connectionString,
      max: isServerless ? 5 : 10,
      idleTimeoutMillis: isServerless ? 10_000 : 30_000,
      connectionTimeoutMillis: 4_000,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
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
