import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/modules/auth/session";
import { createEventFromDashboard, searchEvents } from "@/modules/events/store";

const createEventSchema = z.object({
  title: z.string().trim().min(4, "Le titre doit contenir au moins 4 caractères.").max(180),
  shortSummary: z.string().trim().min(10, "Ajoutez un résumé court (10 car. min).").max(280),
  description: z.string().trim().min(15, "Décrivez l'événement (15 car. min)."),
  category: z.enum([
    "concert",
    "festival",
    "humour",
    "conference",
    "sport",
    "culture",
    "formation",
    "soiree",
  ]),
  countryCode: z.enum(["BF", "CI", "SN", "BJ", "TG", "ML", "NE", "GW"]),
  city: z.string().trim().min(2).max(100),
  venueName: z.string().trim().min(2).max(160),
  venueAddress: z.string().trim().min(4).max(240),
  startsAt: z.string().min(8),
  endsAt: z.string().min(8),
  feeBearer: z.enum(["ORGANIZER", "BUYER"]),
  coverImageUrl: z.string().trim().max(300).optional(),
  tierName: z.string().trim().min(2).max(120),
  tierPriceXof: z.number().int().min(0).max(5_000_000),
  tierTotalQty: z.number().int().min(1).max(100_000),
  promoCode: z.string().trim().max(40).optional(),
  promoPercent: z.number().int().min(0).max(90).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = searchEvents({
    pays: searchParams.get("pays") ?? undefined,
    ville: searchParams.get("ville") ?? undefined,
    categorie: searchParams.get("categorie") ?? undefined,
    periode: (searchParams.get("periode") as "all" | "today" | "weekend" | "month") ?? "all",
    prix: (searchParams.get("prix") as "all" | "free" | "paid") ?? "all",
    q: searchParams.get("q") ?? undefined,
    tri: (searchParams.get("tri") as "date" | "price_asc" | "popular") ?? "date",
    page: Number(searchParams.get("page") ?? "1") || 1,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || (session.role !== "ORGANIZER" && session.role !== "PLATFORM_ADMIN")) {
    return NextResponse.json(
      { ok: false, error: "Veuillez vous connecter en tant qu'organisateur pour publier un événement." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire incomplet." },
        { status: 400 },
      );
    }

    const created = createEventFromDashboard({
      ...parsed.data,
      organizationId: session.organizationId,
    });
    return NextResponse.json({ ok: true, event: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Impossible de créer l'événement." },
      { status: 500 },
    );
  }
}

