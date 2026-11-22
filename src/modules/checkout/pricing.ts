import { z } from "zod";
import { PRICING_CONFIG, type FeeBearer } from "@/config/pricing";

export const checkoutItemInputSchema = z.object({
  tierId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const promoInputSchema = z.object({
  code: z.string().trim().min(2).max(40),
  discountType: z.enum(["PERCENTAGE", "FIXED_XOF"]),
  discountValue: z.number().int().positive(),
});

export interface PricedLineItem {
  tierId: string;
  tierName: string;
  unitPriceXof: number;
  quantity: number;
  lineTotalXof: number;
}

export interface PromoRule {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_XOF";
  discountValue: number;
}

export interface OrderPricingSummary {
  items: PricedLineItem[];
  totalTickets: number;
  subtotalXof: number;
  discountXof: number;
  netAfterDiscountXof: number;
  commissionBps: number;
  feeBearer: FeeBearer;
  buyerFeeXof: number;
  platformCommissionXof: number;
  totalToPayXof: number;
  organizerNetXof: number;
}

/**
 * Calcule de façon déterministe (en entiers XOF) les totaux d'une commande :
 * sous-total, remise promo, commission plateforme, part payée par l'acheteur
 * et montant net revenant à l'organisateur.
 */
export function calculateOrderPricing(params: {
  items: ReadonlyArray<{
    tierId: string;
    tierName: string;
    unitPriceXof: number;
    quantity: number;
  }>;
  promo?: PromoRule | null;
  feeBearer: FeeBearer;
  commissionBps?: number;
}): OrderPricingSummary {
  const commissionBps = params.commissionBps ?? PRICING_CONFIG.standardCommissionBps;

  const pricedItems: PricedLineItem[] = params.items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const unitPriceXof = Math.max(0, Math.round(item.unitPriceXof));
      const quantity = Math.max(0, Math.trunc(item.quantity));
      return {
        tierId: item.tierId,
        tierName: item.tierName,
        unitPriceXof,
        quantity,
        lineTotalXof: unitPriceXof * quantity,
      };
    });

  const totalTickets = pricedItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalXof = pricedItems.reduce((sum, i) => sum + i.lineTotalXof, 0);

  let discountXof = 0;
  if (params.promo && subtotalXof > 0) {
    if (params.promo.discountType === "PERCENTAGE") {
      const clampedPct = Math.min(100, Math.max(0, params.promo.discountValue));
      discountXof = Math.round((subtotalXof * clampedPct) / 100);
    } else {
      discountXof = Math.min(subtotalXof, Math.max(0, Math.round(params.promo.discountValue)));
    }
  }

  const netAfterDiscountXof = Math.max(0, subtotalXof - discountXof);

  // Événement ou commande gratuite : 0 % de commission (engagement Javeroo)
  const platformCommissionXof =
    netAfterDiscountXof === 0 ? 0 : Math.round((netAfterDiscountXof * commissionBps) / 10_000);

  const buyerFeeXof = params.feeBearer === "BUYER" ? platformCommissionXof : 0;
  const totalToPayXof = netAfterDiscountXof + buyerFeeXof;
  const organizerNetXof =
    params.feeBearer === "BUYER"
      ? netAfterDiscountXof
      : Math.max(0, netAfterDiscountXof - platformCommissionXof);

  return {
    items: pricedItems,
    totalTickets,
    subtotalXof,
    discountXof,
    netAfterDiscountXof,
    commissionBps,
    feeBearer: params.feeBearer,
    buyerFeeXof,
    platformCommissionXof,
    totalToPayXof,
    organizerNetXof,
  };
}

