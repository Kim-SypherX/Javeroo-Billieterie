import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { getEventById, registerIssuedTicket } from "@/modules/events/store";
import { appendAuditLog, generateComplimentaryTicket } from "@/modules/operations/store";

const inviteSchema = z.object({
  eventId: z.string().min(1),
  tierId: z.string().min(1),
  guestName: z.string().trim().min(2, "Indiquez le nom complet de l'invité.").max(140),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification organisateur requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Données d'invitation invalides." },
        { status: 400 },
      );
    }

    await hydrateCustomEventsIntoStore();

    const event = getEventById(parsed.data.eventId);
    if (!event) {
      return NextResponse.json({ ok: false, error: "Événement introuvable." }, { status: 404 });
    }
    if (session.role !== "PLATFORM_ADMIN" && event.organizerId !== session.organizationId) {
      return NextResponse.json(
        { ok: false, error: "Vous ne pouvez émettre d'invitations que pour vos propres événements." },
        { status: 403 },
      );
    }
    const tier = event.tiers.find((t) => t.id === parsed.data.tierId) ?? event.tiers[0];
    if (!tier) {
      return NextResponse.json({ ok: false, error: "Catégorie introuvable." }, { status: 404 });
    }

    const ticket = await generateComplimentaryTicket({
      eventId: event.id,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventStartsAt: event.startsAt,
      eventCity: event.city,
      eventVenue: event.venueName,
      tierId: tier.id,
      tierName: tier.name,
      guestName: parsed.data.guestName,
    });

    registerIssuedTicket(ticket);
    appendAuditLog(
      session.fullName,
      "VIP_INVITATION_ISSUED",
      event.title,
      `Invitation gratuite émise pour ${ticket.attendeeName} (${ticket.shortCode}).`,
    );

    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible de générer l'invitation." }, { status: 500 });
  }
}

