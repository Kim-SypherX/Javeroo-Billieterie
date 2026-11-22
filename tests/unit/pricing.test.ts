import { describe, expect, it } from "vitest";
import { PRICING_CONFIG } from "@/config/pricing";
import { calculateOrderPricing } from "@/modules/checkout/pricing";

describe("calculateOrderPricing", () => {
  it("calcule exactement 8 % de commission prise en charge par l'organisateur sur 5 000 FCFA", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "t1", tierName: "Normal", unitPriceXof: 5000, quantity: 1 }],
      feeBearer: "ORGANIZER",
    });

    expect(res.subtotalXof).toBe(5000);
    expect(res.platformCommissionXof).toBe(400);
    expect(res.buyerFeeXof).toBe(0);
    expect(res.totalToPayXof).toBe(5000);
    expect(res.organizerNetXof).toBe(4600);
  });

  it("refacture exactement 400 FCFA à l'acheteur quand feeBearer = BUYER", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "t1", tierName: "Normal", unitPriceXof: 5000, quantity: 1 }],
      feeBearer: "BUYER",
    });

    expect(res.buyerFeeXof).toBe(400);
    expect(res.totalToPayXof).toBe(5400);
    expect(res.organizerNetXof).toBe(5000);
  });

  it("applique 0 % de commission sur les billets gratuits", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "free", tierName: "Gratuit", unitPriceXof: 0, quantity: 3 }],
      feeBearer: "BUYER",
    });

    expect(res.totalTickets).toBe(3);
    expect(res.platformCommissionXof).toBe(0);
    expect(res.totalToPayXof).toBe(0);
    expect(res.organizerNetXof).toBe(0);
  });

  it("applique correctement un code promo pourcentage puis calcule la commission sur le net", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "vip", tierName: "VIP", unitPriceXof: 10000, quantity: 2 }],
      promo: { code: "JAVEROO10", discountType: "PERCENTAGE", discountValue: 10 },
      feeBearer: "ORGANIZER",
    });

    expect(res.subtotalXof).toBe(20000);
    expect(res.discountXof).toBe(2000);
    expect(res.netAfterDiscountXof).toBe(18000);
    expect(res.platformCommissionXof).toBe(1440); // 8 % de 18 000
    expect(res.totalToPayXof).toBe(18000);
    expect(res.organizerNetXof).toBe(16560);
  });

  it("plafonne une remise fixe au sous-total (jamais de total négatif)", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "t1", tierName: "Normal", unitPriceXof: 1500, quantity: 1 }],
      promo: { code: "GIFT5000", discountType: "FIXED_XOF", discountValue: 5000 },
      feeBearer: "ORGANIZER",
    });

    expect(res.discountXof).toBe(1500);
    expect(res.totalToPayXof).toBe(0);
    expect(res.platformCommissionXof).toBe(0);
  });

  it("respecte le palier grands comptes (6 %) lorsque passé en commissionBps", () => {
    const res = calculateOrderPricing({
      items: [{ tierId: "t1", tierName: "Normal", unitPriceXof: 5000, quantity: 3000 }],
      feeBearer: "ORGANIZER",
      commissionBps: PRICING_CONFIG.enterpriseCommissionBps,
    });

    expect(res.subtotalXof).toBe(15_000_000);
    expect(res.platformCommissionXof).toBe(900_000);
    expect(res.organizerNetXof).toBe(14_100_000);
  });
});

