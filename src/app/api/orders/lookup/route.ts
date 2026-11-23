import { NextResponse } from "next/server";
import { z } from "zod";
import { findOrdersByContact } from "@/modules/events/store";
import { readSignedOrdersFromCookie } from "@/modules/orders/receipt-cookie";

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

    const memoryOrders = findOrdersByContact(parsed.data.contact);
    const cookieOrders = await readSignedOrdersFromCookie();
    const cleaned = parsed.data.contact.trim().toLowerCase().replace(/\s+/g, "");

    const matchedFromCookie = cookieOrders.filter((o) => {
      const phoneNorm = o.buyerPhone.toLowerCase().replace(/\s+/g, "");
      const emailNorm = (o.buyerEmail ?? "").toLowerCase().trim();
      return phoneNorm.includes(cleaned) || (emailNorm.length > 0 && emailNorm === cleaned);
    });

    const seen = new Set(memoryOrders.map((o) => o.publicToken));
    const merged = [
      ...memoryOrders,
      ...matchedFromCookie.filter((o) => !seen.has(o.publicToken)),
    ];

    return NextResponse.json({ ok: true, orders: merged });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur lors de la recherche de vos billets." },
      { status: 500 },
    );
  }
}
