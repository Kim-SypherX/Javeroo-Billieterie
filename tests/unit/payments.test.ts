import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { CinetPayGateway } from "@/modules/payments/cinetpay";
import { PawapayGateway, resolvePawapayCorrespondent } from "@/modules/payments/pawapay";
import { SandboxMobileMoneyGateway } from "@/modules/payments/adapter";

describe("Payment Gateways UEMOA (CinetPay, PawaPay & Sandbox)", () => {
  it("valide la signature HMAC-SHA256 des webhooks CinetPay", () => {
    const secret = "cinetpay-secret-key-test";
    const gateway = new CinetPayGateway({
      apiKey: "k",
      siteId: "123",
      secretKey: secret,
    });
    const payload = JSON.stringify({ cpm_trans_id: "TX-001", amountXof: 5000 });
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    expect(gateway.verifyWebhookSignature(payload, sig)).toBe(true);
    expect(gateway.verifyWebhookSignature(payload, "bad-signature")).toBe(false);
  });

  it("résout les correspondants Mobile Money PawaPay en zone UEMOA", () => {
    expect(resolvePawapayCorrespondent("BF", "ORANGE_MONEY")).toBe("ORANGE_BFA");
    expect(resolvePawapayCorrespondent("CI", "WAVE")).toBe("WAVE_CIV");
    expect(resolvePawapayCorrespondent("SN", "ORANGE_MONEY")).toBe("ORANGE_SEN");
    expect(resolvePawapayCorrespondent("BJ", "MTN_MOMO")).toBe("MTN_MOMO_BEN");
    expect(resolvePawapayCorrespondent("BF", "CARD")).toBeNull();
  });

  it("vérifie les signatures webhook PawaPay et Sandbox", () => {
    const secret = "pawapay-webhook-secret-test";
    const pawapay = new PawapayGateway({ apiToken: "tok", webhookSecret: secret });
    const body = JSON.stringify({ depositId: "dep-123", status: "COMPLETED" });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(pawapay.verifyWebhookSignature(body, sig)).toBe(true);
    expect(pawapay.verifyWebhookSignature(body, "wrong")).toBe(false);

    const sandbox = new SandboxMobileMoneyGateway();
    expect(sandbox.providerName).toBe("SANDBOX");
  });
});

