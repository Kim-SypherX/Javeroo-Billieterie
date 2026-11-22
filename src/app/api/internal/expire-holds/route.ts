import { NextResponse } from "next/server";
import { pgReleaseExpiredOrderHolds } from "@/modules/events/pg-transactions";

/**
 * Endpoint Cron sécurisé (CRON_SECRET) destiné à libérer automatiquement les réservations
 * de places impayées au-delà de 10 minutes (évite tout blocage de stock).
 */
export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    const releasedCount = await pgReleaseExpiredOrderHolds();
    return NextResponse.json({
      ok: true,
      releasedOrders: releasedCount,
      executedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      releasedOrders: 0,
      note: "PostgreSQL non connecté dans cet environnement.",
    });
  }
}

