import crypto from "node:crypto";
import type { PaymentMethodId, UemoaCountryCode } from "@/config/uemoa";
import { CinetPayGateway } from "./cinetpay";
import { PawapayGateway } from "./pawapay";

export interface InitiatePaymentRequest {
  orderId: string;
  idempotencyKey: string;
  amountXof: number;
  countryCode: UemoaCountryCode;
  method: PaymentMethodId;
  customerPhone: string;
  customerName: string;
  description: string;
}

export interface InitiatePaymentResponse {
  provider: string;
  providerRef: string;
  status: "INITIATED" | "SUCCEEDED" | "FAILED";
  instructions: string;
}

export interface VerifyPaymentResponse {
  provider: string;
  providerRef: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  amountXof: number;
}

/**
 * Interface d'abstraction multi-agrégateurs UEMOA (Pattern Adapter).
 * Permet de brancher PawaPay, CinetPay, FedaPay, Ligdicash ou Wave sans toucher au cœur checkout.
 */
export interface PaymentGateway {
  readonly providerName: string;
  initiatePayment(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse>;
  verifyTransaction(providerRef: string, expectedAmountXof: number): Promise<VerifyPaymentResponse>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
}

/**
 * Implémentation Sandbox locale sécurisée pour développement et démonstration.
 */
export class SandboxMobileMoneyGateway implements PaymentGateway {
  readonly providerName = "SANDBOX";

  async initiatePayment(req: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    const providerRef = `SBX-${req.countryCode}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    return {
      provider: this.providerName,
      providerRef,
      status: "SUCCEEDED",
      instructions: `Paiement simulé (${req.method}) validé en environnement de démonstration pour ${req.customerPhone}.`,
    };
  }

  async verifyTransaction(
    providerRef: string,
    expectedAmountXof: number,
  ): Promise<VerifyPaymentResponse> {
    return {
      provider: this.providerName,
      providerRef,
      status: providerRef.startsWith("SBX-") ? "SUCCEEDED" : "FAILED",
      amountXof: expectedAmountXof,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "dev-webhook-secret-change-in-production";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export function getPaymentGateway(overrideProvider?: string): PaymentGateway {
  const configured = (overrideProvider ?? process.env.PAYMENT_PROVIDER ?? "sandbox").toLowerCase();
  switch (configured) {
    case "sandbox":
      return new SandboxMobileMoneyGateway();
    case "cinetpay":
      return new CinetPayGateway();
    case "pawapay":
      return new PawapayGateway();
    default:
      throw new Error(
        `Connecteur de paiement inconnu "${configured}". Valeurs supportées : sandbox, cinetpay, pawapay.`,
      );
  }
}
