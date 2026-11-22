import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrdersByContact } from "@/modules/events/store";

const lookupSchema = z.object({
  contact: z.string().trim().min(4, "Saisissez votre numéro de téléphone ou votre e-mail.").max(160),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Contact invalide." },
        { status: 400 },
      );
    }

    const orders = findOrdersByContact(parsed.data.contact);
    return NextResponse.json({ ok: true, orders });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche de vos billets." },
      { status: 500 },
    );
  }
}

