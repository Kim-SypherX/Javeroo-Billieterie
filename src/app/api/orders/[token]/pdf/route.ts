import { NextResponse } from "next/server";
import { getOrderByToken } from "@/modules/events/store";
import { readSignedOrdersFromCookie } from "@/modules/orders/receipt-cookie";
import { generateTicketsPdfBuffer } from "@/modules/tickets/pdf";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  let order = await getOrderByToken(token);

  if (!order) {
    const cookieOrders = await readSignedOrdersFromCookie();
    const matched = cookieOrders.find((o) => o.publicToken === token);
    if (matched) {
      order = { ...matched, tickets: matched.tickets };
    }
  }

  if (!order || order.tickets.length === 0) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const pdfBuffer = generateTicketsPdfBuffer(order.tickets, order.publicToken);
  const safeToken = order.publicToken.replace(/[^A-Za-z0-9_-]/g, "");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="billets-${safeToken}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
