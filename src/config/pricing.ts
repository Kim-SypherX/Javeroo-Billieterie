/**
 * Source de vérité unique de la tarification et des engagements opérationnels Javeroo-Billeterie.
 * Toute modification ici se répercute automatiquement sur la page d'accueil, /tarifs,
 * le simulateur, le tunnel d'achat et les pages légales (CGU / CGVPS).
 */

export type FeeBearer = "ORGANIZER" | "BUYER";

export const PRICING_CONFIG = {
  currency: "XOF" as const,
  currencyLabel: "FCFA",
  monthlySubscriptionXof: 0,
  freeEventCommissionBps: 0,
  /**
   * Règle métier unique : la commission est toujours prélevée côté organisateur.
   * Le spectateur paie exactement le prix affiché sur le billet (0 frais ajoutés).
   */
  defaultFeeBearer: "ORGANIZER" as const,
  /** 800 points de base = 8,00 % tout inclus sur les billets payants */
  standardCommissionBps: 800,
  standardCommissionPercent: 8,
  /** Tarif négocié grands comptes dès 3 000 billets */
  enterpriseCommissionBps: 600,
  enterpriseCommissionPercent: 6,
  enterpriseTicketThreshold: 3000,
  /** Durée de blocage temporaire des places pendant le paiement */
  checkoutHoldMinutes: 10,
  /** Délais uniques de reversement (alignés page Tarifs + Dashboard + CGVPS) */
  payoutSla: {
    mobileMoneyHours: 48,
    mobileMoneyLabel: "48 h ouvrées",
    bankTransferLabel: "3 à 5 jours ouvrés",
  },
  /** Politique d'annulation et de report */
  refundPolicy: {
    cancellationRefundBusinessDays: 14,
    postponementRequestDays: 7,
  },
  /** Règle de protection des spectateurs sur le premier événement d'un nouvel organisateur */
  firstEventPayoutNote:
    "Pour un tout nouvel organisateur réalisant son premier événement, les fonds sont débloqués à J+1 après le démarrage effectif de l'événement (ou par acompte validé après KYC).",
} as const;

