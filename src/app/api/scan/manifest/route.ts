import { NextResponse } from "next/server";
import { getEventById, listTicketsForEvent } from "@/modules/events/store";
import { findActiveScanSessionByCode } from "@/modules/operations/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accessCode = searchParams.get("accessCode")?.trim();
  let eventId = searchParams.get("eventId")?.trim() ?? "";
  let resolvedGateLabel: string | undefined;

  if (accessCode) {
    const gateSession = findActiveScanSessionByCode(accessCode);
    if (!gateSession) {
      return NextResponse.json(
        { ok: false, error: "Code d'accès porte invalide ou révoqué." },
        { status: 401 },
      );
    }
    eventId = gateSession.eventId;
    resolvedGateLabel = gateSession.gateLabel;
  }

  if (!eventId) {
    return NextResponse.json({ ok: false, error: "eventId ou accessCode requis." }, { status: 400 });
  }

  const event = getEventById(eventId);
  if (!event) {
    return NextResponse.json({ ok: false, error: "Événement introuvable." }, { status: 404 });
  }

  const tickets = listTicketsForEvent(event.id).map((t) => ({
    shortCode: t.shortCode,
    ticketId: t.id,
    eventId: t.eventId,
    eventTitle: t.eventTitle,
    tierName: t.tierName,
    attendeeName: t.attendeeName,
    qrPayload: t.qrPayload,
    status: t.status,
    checkedInAt: t.checkedInAt,
    checkedInGate: t.checkedInGate,
  }));

  return NextResponse.json({
    ok: true,
    eventId: event.id,
    eventTitle: event.title,
    gateLabel: resolvedGateLabel,
    syncedAt: new Date().toISOString(),
    tickets,
  });
}

