import { NextResponse } from "next/server";
import { getPgPool } from "@/db";

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

  return NextResponse.json({
    status: "ok",
    service: "javeroo-billeterie",
    env: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    database: dbConnected ? "connected" : "fallback_dev_memory",
    timestamp: new Date().toISOString(),
  });
}

