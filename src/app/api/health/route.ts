import { NextResponse } from "next/server";
import { SITE_CONFIG } from "@/config/site";
import { getPgPool } from "@/db";
import { getActiveStorageDriver } from "@/modules/media/storage";

export async function GET() {
  let dbConnected = false;
  const pool = getPgPool();
  if (pool) {
    try {
      await pool.query("SELECT 1");
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
  }

  const hasSessionSecret = Boolean(
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32,
  );
  const hasTicketSecret = Boolean(
    process.env.TICKET_SIGNING_SECRET && process.env.TICKET_SIGNING_SECRET.length >= 32,
  );

  return NextResponse.json({
    status: "ok",
    service: "javeroo-billeterie",
    env: process.env.VERCEL_ENV ?? process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
    baseUrl: SITE_CONFIG.baseUrl,
    database: dbConnected ? "connected" : "fallback_dev_memory",
    storageDriver: getActiveStorageDriver(),
    paymentProvider: (process.env.PAYMENT_PROVIDER ?? "sandbox").toLowerCase(),
    secretsConfigured: hasSessionSecret && hasTicketSecret,
    timestamp: new Date().toISOString(),
  });
}
