import crypto from "node:crypto";
import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentGateway,
  VerifyPaymentResponse,
} from "./adapter";

/**
 * Connecteur CinetPay (UEMOA — CI, BF, SN, BJ, TG, ML, NE).
 * Documentation officielle : https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation
 */
export class CinetPayGateway implements PaymentGateway {
  readonly providerName = "CINETPAY";
  private readonly apiKey: string;
  private readonly siteId: string;
  private readonly secretKey: string;
  private readonly notifyUrl: string;
  private readonly returnUrl: string;

  constructor(config?: {
    apiKey?: string;
    siteId?: string;
    secretKey?: string;
    baseUrl?: string;
  }) {
    this.apiKey = config?.apiKey ?? process.env.CINETPAY_API_KEY ?? "";
    this.siteId = config?.siteId ?? process.env.CINETPAY_SITE_ID ?? "";
    this.secretKey = config?.secretKey ?? process.env.CINETPAY_SECRET_KEY ?? "";
    const baseUrl = config?.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    this.notifyUrl = `${baseUrl}/api/webhooks/payments/cinetpay`;
    this.returnUrl = `${baseUrl}/mes-billets`;
  }

  async initiatePayment(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.apiKey || !this.siteId) {
      throw new Error("CINETPAY_API_KEY et CINETPAY_SITE_ID sont requis pour CinetPay.");
    }

    // CinetPay impose un montant multiple de 5 FCFA en XOF
    const normalizedAmount = Math.ceil(req.amountXof / 5) * 5;
    const transactionId = req.idempotencyKey.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);

    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: transactionId,
        amount: normalizedAmount,
        currency: "XOF",
        description: req.description.slice(0, 120),
        customer_name: req.customerName,
        customer_phone_number: req.customerPhone,
        notify_url: this.notifyUrl,
        return_url: this.returnUrl,
        channels: req.method === "CARD" ? "CREDIT_CARD" : "MOBILE_MONEY",
        metadata: JSON.stringify({ orderId: req.orderId, countryCode: req.countryCode }),
      }),
    });

    const data = (await response.json()) as {
      code?: string;
      message?: string;
      data?: { payment_url?: string; payment_token?: string };
    };

    if (!response.ok || data.code !== "201" || !data.data?.payment_url) {
      return {
        provider: this.providerName,
        providerRef: transactionId,
        status: "FAILED",
        instructions: data.message ?? "Échec d'initialisation du paiement CinetPay.",
      };
    }

    return {
      provider: this.providerName,
      providerRef: transactionId,
      status: "INITIATED",
      instructions: data.data.payment_url,
    };
  }

  async verifyTransaction(
    providerRef: string,
    expectedAmountXof: number,
  ): Promise<VerifyPaymentResponse> {
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: this.apiKey,
        site_id: this.siteId,
        transaction_id: providerRef,
      }),
    });

    const data = (await response.json()) as {
      code?: string;
      data?: { status?: string; amount?: string | number; currency?: string };
    };

    const paidAmount = Number(data.data?.amount ?? 0);
    const isAccepted =
      response.ok &&
      data.code === "00" &&
      data.data?.status === "ACCEPTED" &&
      data.data?.currency === "XOF" &&
      paidAmount >= expectedAmountXof;

    if (isAccepted) {
      return {
        provider: this.providerName,
        providerRef,
        status: "SUCCEEDED",
        amountXof: paidAmount,
      };
    }

    return {
      provider: this.providerName,
      providerRef,
      status: data.data?.status === "REFUSED" ? "FAILED" : "PENDING",
      amountXof: paidAmount,
    };
  }

  /**
   * Vérification HMAC-SHA256 de l'en-tête x-token envoyé par CinetPay.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.secretKey || !signatureHeader) return false;
    const expected = crypto
      .createHmac("sha256", this.secretKey)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(signatureHeader.trim());
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

