import { NextResponse } from "next/server";
import { z } from "zod";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { createCheckoutOrder } from "@/modules/events/store";
import { buildUpdatedReceiptCookie } from "@/modules/orders/receipt-cookie";

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  items: z
    .array(
      z.object({
        tierId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Sélectionnez au moins un billet."),
  promoCode: z.string().trim().max(40).optional(),
  buyerName: z.string().trim().min(2, "Indiquez votre nom complet.").max(160),
  buyerPhone: z
    .string()
    .trim()
    .min(8, "Indiquez un numéro WhatsApp / téléphone valide.")
    .max(32),
  buyerEmail: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .optional()
    .or(z.literal("")),
  paymentMethod: z.enum([
    "ORANGE_MONEY",
    "WAVE",
    "MOOV_MONEY",
    "MTN_MOMO",
    "MIXX_TMONEY",
    "CARD",
  ]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Données de commande invalides.";
      return NextResponse.json({ ok: false, error: firstIssue }, { status: 400 });
    }

    await hydrateCustomEventsIntoStore();

    const result = await createCheckoutOrder({
      eventId: parsed.data.eventId,
      items: parsed.data.items,
      promoCode: parsed.data.promoCode || undefined,
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      buyerEmail: parsed.data.buyerEmail || undefined,
      paymentMethod: parsed.data.paymentMethod,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }

    const receiptCookie = await buildUpdatedReceiptCookie(result.order);
    const response = NextResponse.json({
      ok: true,
      orderToken: result.order.publicToken,
      order: result.order,
    });
    response.cookies.set(receiptCookie);
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la création de la commande." },
      { status: 500 },
    );
  }
}
