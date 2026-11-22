import { NextResponse } from "next/server";
import { z } from "zod";
import { validateAndCheckinTicket } from "@/modules/events/store";

const syncSchema = z.object({
  checkins: z
    .array(
      z.object({
        id: z.string(),
        shortCode: z.string().min(3),
        qrPayload: z.string().optional(),
        eventId: z.string().min(1),
        gateLabel: z.string().min(1).max(100),
        scannedAt: z.string(),
      }),
    )
    .max(500),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Charge utile de synchronisation invalide." }, { status: 400 });
    }

    const syncedIds: string[] = [];
    const conflicts: Array<{ shortCode: string; reason: string }> = [];

    for (const item of parsed.data.checkins) {
      const outcome = validateAndCheckinTicket({
        codeOrPayload: item.qrPayload || item.shortCode,
        expectedEventId: item.eventId,
        gateLabel: `${item.gateLabel} (sync offline)`,
      });

      syncedIds.push(item.id);
      if (outcome.status !== "VALID") {
        conflicts.push({
          shortCode: item.shortCode,
          reason: outcome.message,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      syncedIds,
      syncedCount: syncedIds.length,
      conflicts,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur de synchronisation hors-ligne." }, { status: 500 });
  }
}

