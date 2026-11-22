import crypto from "node:crypto";
import QRCode from "qrcode";
import { PRICING_CONFIG } from "@/config/pricing";
import {
  computeWalletSummary,
  validatePayoutRequest,
  type LedgerEntryRecord,
  type OrganizationWalletSummary,
} from "@/modules/ledger/service";
import { generateReadableTicketCode, signTicketPayload } from "@/modules/tickets/crypto";
import type { IssuedTicketView } from "@/modules/events/types";

export interface KycSubmissionView {
  id: string;
  organizationId: string;
  organizationName: string;
  legalEntityType: "INDIVIDUAL" | "COMPANY";
  documentType: "CNIB" | "PASSPORT" | "RCCM";
  documentReference: string;
  payoutMethod: "MOBILE_MONEY" | "BANK";
  payoutDestination: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface PayoutRequestView {
  id: string;
  organizationId: string;
  organizationName: string;
  amountXof: number;
  method: "MOBILE_MONEY" | "BANK";
  destination: string;
  status: "REQUESTED" | "COMPLETED" | "REJECTED";
  externalReference?: string;
  rejectionReason?: string;
  requestedAt: string;
  completedAt?: string;
}

export interface ScanSessionView {
  id: string;
  eventId: string;
  eventTitle: string;
  gateLabel: string;
  accessCode: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface AuditLogView {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  createdAt: string;
}

interface OperationsRuntimeState {
  ledgerEntries: LedgerEntryRecord[];
  kycSubmissions: KycSubmissionView[];
  payouts: PayoutRequestView[];
  scanSessions: ScanSessionView[];
  auditLogs: AuditLogView[];
}

declare global {
  var __javerooOpsState: OperationsRuntimeState | undefined;
}

function getOpsState(): OperationsRuntimeState {
  if (!globalThis.__javerooOpsState) {
    const now = new Date();
    const pastIso = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString();
    const recentIso = new Date(now.getTime() - 1000 * 60 * 60 * 6).toISOString();

    globalThis.__javerooOpsState = {
      ledgerEntries: [
        {
          id: "led-seed-01",
          organizationId: "org-faso-scene",
          entryType: "TICKET_SALE",
          amountXof: 2_096_000,
          label: "Ventes billetterie — La Grande Nuit Afrobeat (lot initial)",
          availableAt: pastIso,
          createdAt: pastIso,
        },
        {
          id: "led-seed-02",
          organizationId: "org-faso-scene",
          entryType: "PLATFORM_COMMISSION",
          amountXof: -167_680,
          label: `Commission Javeroo (${PRICING_CONFIG.standardCommissionPercent} % tout inclus)`,
          availableAt: pastIso,
          createdAt: pastIso,
        },
        {
          id: "led-seed-03",
          organizationId: "org-faso-scene",
          entryType: "PAYOUT_HOLD",
          amountXof: -500_000,
          label: "Retrait Mobile Money Orange Money (+226 70 ** ** 33)",
          availableAt: pastIso,
          createdAt: recentIso,
        },
      ],
      kycSubmissions: [
        {
          id: "kyc-seed-01",
          organizationId: "org-faso-scene",
          organizationName: "Faso Scène Productions",
          legalEntityType: "COMPANY",
          documentType: "RCCM",
          documentReference: "BF-OUA-2019-B-4410",
          payoutMethod: "MOBILE_MONEY",
          payoutDestination: "Orange Money · +226 70 11 22 33",
          status: "APPROVED",
          submittedAt: pastIso,
          reviewedAt: pastIso,
        },
        {
          id: "kyc-seed-02",
          organizationId: "org-golfe-culture",
          organizationName: "Collectif Golfe Culture",
          legalEntityType: "COMPANY",
          documentType: "CNIB",
          documentReference: "BJ-COT-889120",
          payoutMethod: "MOBILE_MONEY",
          payoutDestination: "MTN MoMo · +229 01 97 11 22 33",
          status: "PENDING",
          submittedAt: recentIso,
        },
      ],
      payouts: [
        {
          id: "pay-seed-01",
          organizationId: "org-faso-scene",
          organizationName: "Faso Scène Productions",
          amountXof: 500_000,
          method: "MOBILE_MONEY",
          destination: "Orange Money · +226 70 11 22 33",
          status: "REQUESTED",
          requestedAt: recentIso,
        },
      ],
      scanSessions: [
        {
          id: "scan-seed-01",
          eventId: "evt-ouaga-afro-night",
          eventTitle: "La Grande Nuit Afrobeat & Live Band",
          gateLabel: "Entrée Principale",
          accessCode: "GATE-AFRO-01",
          isRevoked: false,
          createdAt: pastIso,
        },
        {
          id: "scan-seed-02",
          eventId: "evt-ouaga-afro-night",
          eventTitle: "La Grande Nuit Afrobeat & Live Band",
          gateLabel: "Carré VIP Assis",
          accessCode: "GATE-VIP-02",
          isRevoked: false,
          createdAt: pastIso,
        },
      ],
      auditLogs: [
        {
          id: "aud-01",
          actor: "Direction Javeroo",
          action: "KYC_APPROVED",
          target: "Faso Scène Productions",
          details: "Validation RCCM BF-OUA-2019-B-4410 et compte Orange Money.",
          createdAt: pastIso,
        },
      ],
    };
  }
  return globalThis.__javerooOpsState;
}

export function appendAuditLog(actor: string, action: string, target: string, details: string) {
  const state = getOpsState();
  state.auditLogs.unshift({
    id: `aud-${crypto.randomBytes(4).toString("hex")}`,
    actor,
    action,
    target,
    details,
    createdAt: new Date().toISOString(),
  });
}

export function recordOrderInLedger(params: {
  organizationId: string;
  orderId: string;
  eventTitle: string;
  netAfterDiscountXof: number;
  platformCommissionXof: number;
  feeBearer: "ORGANIZER" | "BUYER";
}) {
  const state = getOpsState();
  const nowIso = new Date().toISOString();

  if (params.netAfterDiscountXof > 0) {
    state.ledgerEntries.unshift({
      id: `led-${crypto.randomBytes(5).toString("hex")}`,
      organizationId: params.organizationId,
      orderId: params.orderId,
      entryType: "TICKET_SALE",
      amountXof: params.netAfterDiscountXof,
      label: `Vente billetterie — ${params.eventTitle}`,
      availableAt: nowIso,
      createdAt: nowIso,
    });
  }

  if (params.platformCommissionXof > 0 && params.feeBearer === "ORGANIZER") {
    state.ledgerEntries.unshift({
      id: `led-${crypto.randomBytes(5).toString("hex")}`,
      organizationId: params.organizationId,
      orderId: params.orderId,
      entryType: "PLATFORM_COMMISSION",
      amountXof: -params.platformCommissionXof,
      label: `Commission Javeroo (${PRICING_CONFIG.standardCommissionPercent} %)`,
      availableAt: nowIso,
      createdAt: nowIso,
    });
  }
}

export function getOrganizationWallet(organizationId: string): {
  summary: OrganizationWalletSummary;
  entries: LedgerEntryRecord[];
  payouts: PayoutRequestView[];
  latestKyc: KycSubmissionView | null;
} {
  const state = getOpsState();
  const entries = state.ledgerEntries.filter((e) => e.organizationId === organizationId);
  const payouts = state.payouts.filter((p) => p.organizationId === organizationId);
  const latestKyc =
    state.kycSubmissions.find((k) => k.organizationId === organizationId) ?? null;

  return {
    summary: computeWalletSummary(entries),
    entries: entries.slice(0, 20),
    payouts,
    latestKyc,
  };
}

export function submitOrganizationKyc(input: {
  organizationId: string;
  organizationName: string;
  legalEntityType: "INDIVIDUAL" | "COMPANY";
  documentType: "CNIB" | "PASSPORT" | "RCCM";
  documentReference: string;
  payoutMethod: "MOBILE_MONEY" | "BANK";
  payoutDestination: string;
  actorName: string;
}): KycSubmissionView {
  const state = getOpsState();
  const submission: KycSubmissionView = {
    id: `kyc-${crypto.randomBytes(4).toString("hex")}`,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    legalEntityType: input.legalEntityType,
    documentType: input.documentType,
    documentReference: input.documentReference.trim(),
    payoutMethod: input.payoutMethod,
    payoutDestination: input.payoutDestination.trim(),
    status: "PENDING",
    submittedAt: new Date().toISOString(),
  };
  state.kycSubmissions.unshift(submission);
  appendAuditLog(
    input.actorName,
    "KYC_SUBMITTED",
    input.organizationName,
    `Document ${input.documentType} (${input.documentReference}) déposé.`,
  );
  return submission;
}

export function createOrganizationPayout(input: {
  organizationId: string;
  organizationName: string;
  amountXof: number;
  method: "MOBILE_MONEY" | "BANK";
  destination: string;
  actorName: string;
}): { ok: true; payout: PayoutRequestView } | { ok: false; error: string } {
  const state = getOpsState();
  const wallet = getOrganizationWallet(input.organizationId);
  const kycApproved = wallet.latestKyc?.status === "APPROVED";

  const check = validatePayoutRequest({
    requestedAmountXof: Math.round(input.amountXof),
    availableBalanceXof: wallet.summary.availableForPayoutXof,
    kycApproved,
  });
  if (!check.ok) {
    return check;
  }

  const nowIso = new Date().toISOString();
  const payout: PayoutRequestView = {
    id: `pay-${crypto.randomBytes(4).toString("hex")}`,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    amountXof: Math.round(input.amountXof),
    method: input.method,
    destination: input.destination.trim(),
    status: "REQUESTED",
    requestedAt: nowIso,
  };

  state.payouts.unshift(payout);
  state.ledgerEntries.unshift({
    id: `led-${crypto.randomBytes(5).toString("hex")}`,
    organizationId: input.organizationId,
    payoutId: payout.id,
    entryType: "PAYOUT_HOLD",
    amountXof: -payout.amountXof,
    label: `Demande de retrait (${input.method}) — ${input.destination}`,
    availableAt: nowIso,
    createdAt: nowIso,
  });

  appendAuditLog(
    input.actorName,
    "PAYOUT_REQUESTED",
    input.organizationName,
    `Retrait de ${payout.amountXof.toLocaleString("fr-FR")} FCFA vers ${payout.destination}.`,
  );

  return { ok: true, payout };
}

export function listAllAdminOperations() {
  const state = getOpsState();
  return {
    kycSubmissions: state.kycSubmissions,
    payouts: state.payouts,
    auditLogs: state.auditLogs.slice(0, 30),
  };
}

export function reviewKycSubmission(params: {
  kycId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  actorName: string;
  onApproved?: (organizationId: string) => void;
}): KycSubmissionView | null {
  const state = getOpsState();
  const kyc = state.kycSubmissions.find((k) => k.id === params.kycId);
  if (!kyc) return null;

  kyc.status = params.decision;
  kyc.rejectionReason = params.decision === "REJECTED" ? params.rejectionReason : undefined;
  kyc.reviewedAt = new Date().toISOString();

  if (params.decision === "APPROVED") {
    params.onApproved?.(kyc.organizationId);
  }

  appendAuditLog(
    params.actorName,
    params.decision === "APPROVED" ? "KYC_APPROVED" : "KYC_REJECTED",
    kyc.organizationName,
    params.decision === "APPROVED"
      ? `Dossier ${kyc.documentType} validé.`
      : `Rejeté : ${params.rejectionReason ?? "Document incomplet"}.`,
  );

  return kyc;
}

export function processAdminPayout(params: {
  payoutId: string;
  decision: "COMPLETED" | "REJECTED";
  externalReference?: string;
  rejectionReason?: string;
  actorName: string;
}): PayoutRequestView | null {
  const state = getOpsState();
  const payout = state.payouts.find((p) => p.id === params.payoutId);
  if (!payout || payout.status !== "REQUESTED") return null;

  const nowIso = new Date().toISOString();
  payout.status = params.decision;
  payout.completedAt = nowIso;

  if (params.decision === "COMPLETED") {
    payout.externalReference =
      params.externalReference?.trim() ||
      `VIR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    appendAuditLog(
      params.actorName,
      "PAYOUT_COMPLETED",
      payout.organizationName,
      `Virement de ${payout.amountXof.toLocaleString("fr-FR")} FCFA exécuté (Réf. ${payout.externalReference}).`,
    );
  } else {
    payout.rejectionReason = params.rejectionReason ?? "Vérification requise";
    // Recréditation automatique dans le grand livre immuable
    state.ledgerEntries.unshift({
      id: `led-${crypto.randomBytes(5).toString("hex")}`,
      organizationId: payout.organizationId,
      payoutId: payout.id,
      entryType: "PAYOUT_RELEASE",
      amountXof: payout.amountXof,
      label: `Recrédit suite rejet retrait (${payout.rejectionReason})`,
      availableAt: nowIso,
      createdAt: nowIso,
    });
    appendAuditLog(
      params.actorName,
      "PAYOUT_REJECTED",
      payout.organizationName,
      `Demande de ${payout.amountXof.toLocaleString("fr-FR")} FCFA rejetée et recréditée.`,
    );
  }

  return payout;
}

export function listScanSessions(eventIds?: string[]): ScanSessionView[] {
  const state = getOpsState();
  if (!eventIds) return state.scanSessions;
  const set = new Set(eventIds);
  return state.scanSessions.filter((s) => set.has(s.eventId));
}

export function createScanSession(params: {
  eventId: string;
  eventTitle: string;
  gateLabel: string;
  actorName: string;
}): ScanSessionView {
  const state = getOpsState();
  const code = `GATE-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const session: ScanSessionView = {
    id: `scan-${crypto.randomBytes(4).toString("hex")}`,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    gateLabel: params.gateLabel.trim() || "Entrée Principale",
    accessCode: code,
    isRevoked: false,
    createdAt: new Date().toISOString(),
  };
  state.scanSessions.unshift(session);
  appendAuditLog(
    params.actorName,
    "SCAN_SESSION_CREATED",
    params.eventTitle,
    `Accès porte "${session.gateLabel}" créé (${code}).`,
  );
  return session;
}

export function revokeScanSession(sessionId: string, actorName: string): boolean {
  const state = getOpsState();
  const session = state.scanSessions.find((s) => s.id === sessionId);
  if (!session) return false;
  session.isRevoked = true;
  appendAuditLog(
    actorName,
    "SCAN_SESSION_REVOKED",
    session.eventTitle,
    `Accès porte "${session.gateLabel}" révoqué.`,
  );
  return true;
}

export function findActiveScanSessionByCode(accessCode: string): ScanSessionView | null {
  const norm = accessCode.trim().toUpperCase();
  return (
    getOpsState().scanSessions.find((s) => !s.isRevoked && s.accessCode.toUpperCase() === norm) ??
    null
  );
}

export async function generateComplimentaryTicket(params: {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string;
  eventCity: string;
  eventVenue: string;
  tierId: string;
  tierName: string;
  guestName: string;
}): Promise<IssuedTicketView> {
  const ticketId = `tkt-vip-${crypto.randomBytes(5).toString("hex")}`;
  const shortCode = generateReadableTicketCode();
  const qrPayload = signTicketPayload({
    ticketId,
    eventId: params.eventId,
    tierCode: "INVITATION",
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 240,
    margin: 1,
    color: { dark: "#1B2A4A", light: "#FFFFFF" },
  });

  return {
    id: ticketId,
    shortCode,
    qrPayload,
    qrDataUrl,
    eventId: params.eventId,
    eventTitle: params.eventTitle,
    eventSlug: params.eventSlug,
    eventStartsAt: params.eventStartsAt,
    eventCity: params.eventCity,
    eventVenue: params.eventVenue,
    tierId: params.tierId,
    tierName: `${params.tierName} (Invitation)`,
    unitPriceXof: 0,
    attendeeName: params.guestName.trim(),
    status: "VALID",
  };
}

function escapeCsvCell(val: string | number | undefined): string {
  const str = String(val ?? "");
  if (/[",;\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Génère un fichier CSV UTF-8 avec BOM (ouverture directe dans Excel avec accents préservés).
 */
export function buildEventParticipantsCsv(tickets: ReadonlyArray<IssuedTicketView>): string {
  const header = [
    "Code Billet",
    "Participant",
    "Catégorie",
    "Prix (FCFA)",
    "Statut",
    "Heure de scan",
    "Porte",
  ];
  const rows = tickets.map((t) => [
    escapeCsvCell(t.shortCode),
    escapeCsvCell(t.attendeeName),
    escapeCsvCell(t.tierName),
    escapeCsvCell(t.unitPriceXof),
    escapeCsvCell(t.status === "USED" ? "Scanné" : t.status === "VALID" ? "Valide" : "Révoqué"),
    escapeCsvCell(t.checkedInAt ? new Date(t.checkedInAt).toLocaleString("fr-FR") : ""),
    escapeCsvCell(t.checkedInGate ?? ""),
  ]);

  return "\uFEFF" + [header.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
}

