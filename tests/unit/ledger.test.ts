import { describe, expect, it } from "vitest";
import {
  computeWalletSummary,
  validatePayoutRequest,
  type LedgerEntryRecord,
} from "@/modules/ledger/service";

describe("Append-only financial ledger", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const past = "2026-11-20T12:00:00Z";
  const future = "2026-11-25T12:00:00Z";

  it("calcule exactement le solde disponible, les commissions, les fonds en attente et les retraits", () => {
    const entries: LedgerEntryRecord[] = [
      {
        id: "1",
        organizationId: "org-1",
        entryType: "TICKET_SALE",
        amountXof: 100_000,
        label: "Vente lot 1",
        availableAt: past,
        createdAt: past,
      },
      {
        id: "2",
        organizationId: "org-1",
        entryType: "PLATFORM_COMMISSION",
        amountXof: -8_000,
        label: "Commission 8 %",
        availableAt: past,
        createdAt: past,
      },
      {
        id: "3",
        organizationId: "org-1",
        entryType: "PAYOUT_HOLD",
        amountXof: -30_000,
        label: "Retrait Mobile Money",
        availableAt: past,
        createdAt: past,
      },
      {
        id: "4",
        organizationId: "org-1",
        entryType: "TICKET_SALE",
        amountXof: 50_000,
        label: "Vente en période de sécurité",
        availableAt: future,
        createdAt: past,
      },
    ];

    const summary = computeWalletSummary(entries, now);
    expect(summary.grossSalesXof).toBe(150_000);
    expect(summary.totalCommissionsXof).toBe(8_000);
    expect(summary.netEarnedXof).toBe(142_000);
    expect(summary.withdrawnOrHeldXof).toBe(30_000);
    expect(summary.availableForPayoutXof).toBe(62_000); // 100k - 8k - 30k
    expect(summary.pendingClearanceXof).toBe(50_000);
  });

  it("recrédite le solde disponible quand un retrait rejeté émet un PAYOUT_RELEASE", () => {
    const entries: LedgerEntryRecord[] = [
      {
        id: "1",
        organizationId: "org-1",
        entryType: "TICKET_SALE",
        amountXof: 50_000,
        label: "Vente",
        availableAt: past,
        createdAt: past,
      },
      {
        id: "2",
        organizationId: "org-1",
        entryType: "PAYOUT_HOLD",
        amountXof: -20_000,
        label: "Demande retrait",
        availableAt: past,
        createdAt: past,
      },
      {
        id: "3",
        organizationId: "org-1",
        entryType: "PAYOUT_RELEASE",
        amountXof: 20_000,
        label: "Rejet retrait",
        availableAt: past,
        createdAt: past,
      },
    ];

    const summary = computeWalletSummary(entries, now);
    expect(summary.withdrawnOrHeldXof).toBe(0);
    expect(summary.availableForPayoutXof).toBe(50_000);
  });

  it("bloque un retrait si KYC non approuvé ou solde insuffisant", () => {
    expect(
      validatePayoutRequest({
        requestedAmountXof: 10_000,
        availableBalanceXof: 50_000,
        kycApproved: false,
      }).ok,
    ).toBe(false);

    expect(
      validatePayoutRequest({
        requestedAmountXof: 60_000,
        availableBalanceXof: 50_000,
        kycApproved: true,
      }).ok,
    ).toBe(false);

    expect(
      validatePayoutRequest({
        requestedAmountXof: 25_000,
        availableBalanceXof: 50_000,
        kycApproved: true,
      }).ok,
    ).toBe(true);
  });
});

