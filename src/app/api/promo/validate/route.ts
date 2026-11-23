import { NextResponse } from "next/server";
import { z } from "zod";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { validateEventPromoCode } from "@/modules/events/store";

const bodySchema = z.object({
  eventId: z.string().min(1),
  code: z.string().trim().min(2).max(40),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, message: "Veuillez saisir un code promo valide." },
        { status: 400 },
      );
    }

    await hydrateCustomEventsIntoStore();
    const result = validateEventPromoCode(parsed.data.eventId, parsed.data.code);
    return NextResponse.json(result, { status: result.valid ? 200 : 404 });
  } catch {
    return NextResponse.json(
      { valid: false, message: "Impossible de vérifier le code promo." },
      { status: 400 },
    );
  }
}

