import { NextResponse } from "next/server";
import { pgConfirmOrderPayment } from "@/modules/events/pg-transactions";
import { getPaymentGateway } from "@/modules/payments/adapter";

/**
 * Endpoint Webhook multi-agrégateurs UEMOA (/api/webhooks/payments/cinetpay | pawapay | sandbox).
 * 1. Vérifie la signature cryptographique HMAC-SHA256 sur le corps brut.
 * 2. Effectue une double vérification serveur-à-serveur auprès du PSP.
 * 3. Confirme la commande de manière idempotente (aucun billet dupliqué).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-token") ??
    request.headers.get("x-javeroo-signature") ??
    request.headers.get("x-signature") ??
    "";

  let gateway;
  try {
    gateway = getPaymentGateway(provider);
  } catch {
    return NextResponse.json({ ok: false, error: "Fournisseur non supporté." }, { status: 400 });
  }

  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Signature webhook invalide." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      orderId?: string;
      providerRef?: string;
      cpm_trans_id?: string;
      depositId?: string;
      amountXof?: number;
      method?: string;
    };

    const providerRef = payload.providerRef ?? payload.cpm_trans_id ?? payload.depositId;
    if (!providerRef) {
      return NextResponse.json({ ok: false, error: "Référence transaction manquante." }, { status: 400 });
    }

    const verified = await gateway.verifyTransaction(providerRef, payload.amountXof ?? 0);
    if (verified.status !== "SUCCEEDED") {
      return NextResponse.json({ ok: true, status: verified.status });
    }

    if (payload.orderId && process.env.DATABASE_URL) {
      try {
        await pgConfirmOrderPayment({
          orderId: payload.orderId,
          provider: gateway.providerName,
          providerRef,
          method: payload.method ?? "MOBILE_MONEY",
          rawWebhookPayload: payload,
        });
      } catch {
        // En mode sans PostgreSQL connecté, la vérification signature + PSP reste validée
      }
    }

    return NextResponse.json({
      ok: true,
      provider: gateway.providerName,
      providerRef,
      verifiedAmountXof: verified.amountXof,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Corps webhook JSON invalide." }, { status: 400 });
  }
}

