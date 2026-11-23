import crypto from "node:crypto";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import type { OrderView } from "@/modules/events/types";

export const RECEIPT_COOKIE_NAME = "javeroo_orders";

function getReceiptSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.TICKET_SIGNING_SECRET ??
    "dev-receipt-secret-change-me-in-production-64-chars-javeroo-uemoa"
  );
}

/**
 * Version compacte d'une commande (sans qrDataUrl qui est régénéré à la volée)
 * stockée dans un cookie HttpOnly signé HMAC-SHA256 afin de garantir la continuité
 * entre fonctions serverless Vercel (checkout -> /commandes/[token] -> PDF -> /mes-billets)
 * même avant branchement de PostgreSQL.
 */
type CompactOrder = Omit<OrderView, "tickets"> & {
  tickets: Array<Omit<OrderView["tickets"][number], "qrDataUrl">>;
};

function stripDataUrls(order: OrderView): CompactOrder {
  return {
    ...order,
    tickets: order.tickets.map(({ qrDataUrl: _ignored, ...rest }) => rest),
  };
}

function signPayload(jsonStr: string): string {
  const encoded = Buffer.from(jsonStr, "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getReceiptSecret())
    .update(encoded)
    .digest("base64url")
    .slice(0, 24);
  return `${encoded}.${sig}`;
}

function verifyAndDecode(cookieValue: string): CompactOrder[] {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return [];
  const [encoded, sig] = parts;
  if (!encoded || !sig) return [];

  const expected = crypto
    .createHmac("sha256", getReceiptSecret())
    .update(encoded)
    .digest("base64url")
    .slice(0, 24);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return [];
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? (parsed as CompactOrder[]) : [];
  } catch {
    return [];
  }
}

export async function readSignedOrdersFromCookie(): Promise<CompactOrder[]> {
  try {
    const store = await cookies();
    const raw = store.get(RECEIPT_COOKIE_NAME)?.value;
    if (!raw) return [];
    return verifyAndDecode(raw);
  } catch {
    return [];
  }
}

export async function buildUpdatedReceiptCookie(newOrder: OrderView) {
  const existing = await readSignedOrdersFromCookie();
  const compact = stripDataUrls(newOrder);
  const deduped = [compact, ...existing.filter((o) => o.publicToken !== compact.publicToken)].slice(
    0,
    3,
  );
  // S'assure que le cookie reste toujours sous 3.8 Ko (limite navigateurs = 4 Ko)
  let trimmed = deduped;
  let signed = signPayload(JSON.stringify(trimmed));
  while (signed.length > 3700 && trimmed.length > 1) {
    trimmed = trimmed.slice(0, -1);
    signed = signPayload(JSON.stringify(trimmed));
  }

  return {
    name: RECEIPT_COOKIE_NAME,
    value: signed,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  };
}

export async function hydrateOrderWithQrImages(order: CompactOrder | OrderView): Promise<OrderView> {
  const hydratedTickets = await Promise.all(
    order.tickets.map(async (t) => ({
      ...t,
      qrDataUrl:
        "qrDataUrl" in t && t.qrDataUrl
          ? t.qrDataUrl
          : await QRCode.toDataURL(t.qrPayload, {
              width: 240,
              margin: 1,
              color: { dark: "#1B2A4A", light: "#FFFFFF" },
            }),
    })),
  );
  return {
    ...order,
    tickets: hydratedTickets,
  };
}

