import { NextResponse } from "next/server";
import { getCurrentSession } from "@/modules/auth/session";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { getEventById, listTicketsForEvent } from "@/modules/events/store";
import { buildEventParticipantsCsv } from "@/modules/operations/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await hydrateCustomEventsIntoStore();

  const { eventId } = await context.params;
  const event = getEventById(eventId);
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
  }
  if (session.role !== "PLATFORM_ADMIN" && event.organizerId !== session.organizationId) {
    return NextResponse.json(
      { error: "Accès refusé : cet événement appartient à un autre organisateur." },
      { status: 403 },
    );
  }

  const tickets = listTicketsForEvent(event.id);
  const csv = buildEventParticipantsCsv(tickets);
  const safeFilename = `participants-${event.slug}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "no-store",
    },
  });
}

