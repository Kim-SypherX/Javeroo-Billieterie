import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { toggleEventFeaturedFlag } from "@/modules/events/store";
import { appendAuditLog } from "@/modules/operations/store";

const modSchema = z.object({
  eventId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || session.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ ok: false, error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = modSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "eventId requis." }, { status: 400 });
    }

    const updated = toggleEventFeaturedFlag(parsed.data.eventId);
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Événement introuvable." }, { status: 404 });
    }

    appendAuditLog(
      session.fullName,
      "EVENT_FEATURED_TOGGLED",
      updated.title,
      updated.isFeatured ? "Mis en avant À la une." : "Retiré de la sélection À la une.",
    );

    return NextResponse.json({ ok: true, event: { id: updated.id, isFeatured: updated.isFeatured } });
  } catch {
    return NextResponse.json({ ok: false, error: "Erreur de modération." }, { status: 500 });
  }
}

