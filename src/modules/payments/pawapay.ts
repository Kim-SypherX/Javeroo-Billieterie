import crypto from "node:crypto";
import type { PaymentMethodId, UemoaCountryCode } from "@/config/uemoa";
import type {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentGateway,
  VerifyPaymentResponse,
} from "./adapter";

/**
 * Mapping des correspondants Mobile Money PawaPay pour la zone UEMOA.
 */
const PAWAPAY_CORRESPONDENTS: Partial<Record<`${UemoaCountryCode}:${PaymentMethodId}`, string>> = {
  "BF:ORANGE_MONEY": "ORANGE_BFA",
  "BF:MOOV_MONEY": "MOOV_BFA",
  "CI:ORANGE_MONEY": "ORANGE_CIV",
  "CI:MTN_MOMO": "MTN_MOMO_CIV",
  "CI:MOOV_MONEY": "MOOV_CIV",
  "CI:WAVE": "WAVE_CIV",
  "SN:ORANGE_MONEY": "ORANGE_SEN",
  "SN:WAVE": "WAVE_SEN",
  "SN:MIXX_TMONEY": "FREE_SEN",
  "BJ:MTN_MOMO": "MTN_MOMO_BEN",
  "BJ:MOOV_MONEY": "MOOV_BEN",
  "TG:MIXX_TMONEY": "TMONEY_TGO",
  "TG:MOOV_MONEY": "MOOV_TGO",
  "ML:ORANGE_MONEY": "ORANGE_MLI",
  "ML:MOOV_MONEY": "MOOV_MLI",
};

export function resolvePawapayCorrespondent(
  countryCode: UemoaCountryCode,
  method: PaymentMethodId,
): string | null {
  return PAWAPAY_CORRESPONDENTS[`${countryCode}:${method}`] ?? null;
}

/**
 * Connecteur PawaPay (Mobile Money direct UEMOA — push USSD/notification sans redirection).
 */
export class PawapayGateway implements PaymentGateway {
  readonly providerName = "PAWAPAY";
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly webhookSecret: string;

  constructor(config?: { apiToken?: string; baseUrl?: string; webhookSecret?: string }) {
    this.apiToken = config?.apiToken ?? process.env.PAWAPAY_API_TOKEN ?? "";
    this.baseUrl =
      config?.baseUrl ??
      process.env.PAWAPAY_API_URL ??
      "https://api.sandbox.pawapay.io";
    this.webhookSecret = config?.webhookSecret ?? process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  }

  async initiatePayment(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.apiToken) {
      throw new Error("PAWAPAY_API_TOKEN est requis pour PawaPay.");
    }
    const correspondent = resolvePawapayCorrespondent(req.countryCode, req.method);
    if (!correspondent) {
      return {
        provider: this.providerName,
        providerRef: req.idempotencyKey,
        status: "FAILED",
        instructions: `Opérateur ${req.method} non pris en charge par PawaPay pour ${req.countryCode}.`,
      };
    }

    const depositId = crypto.randomUUID();
    const msisdn = req.customerPhone.replace(/[^0-9]/g, "");

    const response = await fetch(`${this.baseUrl}/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        depositId,
        amount: String(Math.round(req.amountXof)),
        currency: "XOF",
        correspondent,
        payer: { type: "MSISDN", address: { value: msisdn } },
        customerTimestamp: new Date().toISOString(),
        statementDescription: req.description.slice(0, 22),
      }),
    });

    if (!response.ok) {
      return {
        provider: this.providerName,
        providerRef: depositId,
        status: "FAILED",
        instructions: "Impossible d'initier le paiement Mobile Money PawaPay.",
      };
    }

    return {
      provider: this.providerName,
      providerRef: depositId,
      status: "INITIATED",
      instructions: `Validez la demande de paiement sur votre téléphone (${correspondent}).`,
    };
  }

  async verifyTransaction(
    providerRef: string,
    expectedAmountXof: number,
  ): Promise<VerifyPaymentResponse> {
    const response = await fetch(`${this.baseUrl}/deposits/${encodeURIComponent(providerRef)}`, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
    if (!response.ok) {
      return {
        provider: this.providerName,
        providerRef,
        status: "PENDING",
        amountXof: 0,
      };
    }

    const payload = (await response.json()) as Array<{
      status?: string;
      depositedAmount?: string;
      currency?: string;
    }>;
    const first = payload[0];
    const paid = Number(first?.depositedAmount ?? 0);

    if (first?.status === "COMPLETED" && first.currency === "XOF" && paid >= expectedAmountXof) {
      return { provider: this.providerName, providerRef, status: "SUCCEEDED", amountXof: paid };
    }
    if (first?.status === "FAILED" || first?.status === "REJECTED") {
      return { provider: this.providerName, providerRef, status: "FAILED", amountXof: paid };
    }
    return { provider: this.providerName, providerRef, status: "PENDING", amountXof: paid };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret || !signatureHeader) return false;
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(signatureHeader.trim());
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

