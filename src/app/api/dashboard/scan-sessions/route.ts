import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { getEventById } from "@/modules/events/store";
import { createScanSession, revokeScanSession } from "@/modules/operations/store";

const createSchema = z.object({
  eventId: z.string().min(1),
  gateLabel: z.string().trim().min(2, "Indiquez le nom de la porte (ex. Porte VIP).").max(80),
});

const revokeSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification organisateur requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Paramètres invalides." },
        { status: 400 },
      );
    }

    const event = getEventById(parsed.data.eventId);
    if (!event) {
      return NextResponse.json({ ok: false, error: "Événement introuvable." }, { status: 404 });
    }

    const scanSession = createScanSession({
      eventId: event.id,
      eventTitle: event.title,
      gateLabel: parsed.data.gateLabel,
      actorName: session.fullName,
    });

    return NextResponse.json({ ok: true, scanSession }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible de créer l'accès porte." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json({ ok: false, error: "Authentification organisateur requise." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "ID de session requis." }, { status: 400 });
    }

    const ok = revokeScanSession(parsed.data.sessionId, session.fullName);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Session introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Impossible de révoquer la session." }, { status: 500 });
  }
}

