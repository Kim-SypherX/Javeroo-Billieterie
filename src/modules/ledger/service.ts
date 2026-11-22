/**
 * Service de calcul du Grand Livre Comptable immuable (append-only).
 * Aucun solde n'est modifié en place : chaque flux (vente, commission, remboursement,
 * blocage retrait, libération après rejet) ajoute une écriture signée en XOF entier.
 */

export type LedgerEntryType =
  | "TICKET_SALE"
  | "PLATFORM_COMMISSION"
  | "PAYMENT_FEE"
  | "REFUND"
  | "PAYOUT_HOLD"
  | "PAYOUT_RELEASE"
  | "ADJUSTMENT";

export interface LedgerEntryRecord {
  id: string;
  organizationId: string;
  orderId?: string;
  payoutId?: string;
  entryType: LedgerEntryType;
  /** Montant signé en FCFA entier : > 0 crédit organisateur, < 0 débit */
  amountXof: number;
  label: string;
  availableAt: string;
  createdAt: string;
}

export interface OrganizationWalletSummary {
  grossSalesXof: number;
  totalCommissionsXof: number;
  totalRefundsXof: number;
  netEarnedXof: number;
  pendingClearanceXof: number;
  withdrawnOrHeldXof: number;
  availableForPayoutXof: number;
}

export function computeWalletSummary(
  entries: ReadonlyArray<LedgerEntryRecord>,
  now: Date = new Date(),
): OrganizationWalletSummary {
  const nowMs = now.getTime();

  let grossSalesXof = 0;
  let totalCommissionsXof = 0;
  let totalRefundsXof = 0;
  let pendingClearanceXof = 0;
  let withdrawnOrHeldXof = 0;
  let availableBalanceRaw = 0;

  for (const entry of entries) {
    const isAvailable = new Date(entry.availableAt).getTime() <= nowMs;

    switch (entry.entryType) {
      case "TICKET_SALE":
        grossSalesXof += entry.amountXof;
        break;
      case "PLATFORM_COMMISSION":
      case "PAYMENT_FEE":
        totalCommissionsXof += Math.abs(entry.amountXof);
        break;
      case "REFUND":
        totalRefundsXof += Math.abs(entry.amountXof);
        break;
      case "PAYOUT_HOLD":
        withdrawnOrHeldXof += Math.abs(entry.amountXof);
        break;
      case "PAYOUT_RELEASE":
        withdrawnOrHeldXof -= Math.abs(entry.amountXof);
        break;
      case "ADJUSTMENT":
        break;
    }

    if (isAvailable) {
      availableBalanceRaw += entry.amountXof;
    } else {
      pendingClearanceXof += entry.amountXof;
    }
  }

  const netEarnedXof = Math.max(0, grossSalesXof - totalCommissionsXof - totalRefundsXof);
  const availableForPayoutXof = Math.max(0, availableBalanceRaw);

  return {
    grossSalesXof,
    totalCommissionsXof,
    totalRefundsXof,
    netEarnedXof,
    pendingClearanceXof: Math.max(0, pendingClearanceXof),
    withdrawnOrHeldXof: Math.max(0, withdrawnOrHeldXof),
    availableForPayoutXof,
  };
}

export function validatePayoutRequest(params: {
  requestedAmountXof: number;
  availableBalanceXof: number;
  kycApproved: boolean;
  minimumPayoutXof?: number;
}): { ok: true } | { ok: false; error: string } {
  const minXof = params.minimumPayoutXof ?? 5000;

  if (!params.kycApproved) {
    return {
      ok: false,
      error: "Votre dossier d'identité (KYC) doit être validé avant votre premier retrait.",
    };
  }
  if (!Number.isInteger(params.requestedAmountXof) || params.requestedAmountXof < minXof) {
    return {
      ok: false,
      error: `Le montant minimum d'un retrait est de ${minXof.toLocaleString("fr-FR")} FCFA.`,
    };
  }
  if (params.requestedAmountXof > params.availableBalanceXof) {
    return {
      ok: false,
      error: `Solde disponible insuffisant (${params.availableBalanceXof.toLocaleString("fr-FR")} FCFA disponibles).`,
    };
  }
  return { ok: true };
}

