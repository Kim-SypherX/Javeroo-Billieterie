"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  Download,
  Gift,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Wallet,
} from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { formatEventDate, formatXof } from "@/config/uemoa";
import type { EventView, IssuedTicketView } from "@/modules/events/types";
import { getEventAvailability } from "@/modules/events/types";
import type { LedgerEntryRecord, OrganizationWalletSummary } from "@/modules/ledger/service";
import type {
  KycSubmissionView,
  PayoutRequestView,
  ScanSessionView,
} from "@/modules/operations/store";
import type { VoteCampaignView } from "@/modules/votes/types";
import { OrganizerEventForm } from "./OrganizerEventForm";
import { OrganizerVoteManager } from "./OrganizerVoteManager";

interface DashboardWorkspaceProps {
  events: EventView[];
  voteCampaigns: VoteCampaignView[];
  isAdmin?: boolean;
  walletSummary: OrganizationWalletSummary;
  ledgerEntries: LedgerEntryRecord[];
  payouts: PayoutRequestView[];
  latestKyc: KycSubmissionView | null;
  scanSessions: ScanSessionView[];
}

type TabId = "events" | "votes" | "vip" | "gates" | "finance";

export function DashboardWorkspace({
  events,
  voteCampaigns,
  isAdmin = false,
  walletSummary,
  ledgerEntries,
  payouts,
  latestKyc,
  scanSessions,
}: DashboardWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("events");

  // VIP Invitation state
  const [vipEventId, setVipEventId] = useState(events[0]?.id ?? "");
  const [vipGuestName, setVipGuestName] = useState("");
  const [vipLoading, setVipLoading] = useState(false);
  const [vipTicket, setVipTicket] = useState<IssuedTicketView | null>(null);
  const [vipError, setVipError] = useState<string | null>(null);

  // Scan Session (Gate access code) state
  const [gateSessions, setGateSessions] = useState<ScanSessionView[]>(scanSessions);
  const [gateEventId, setGateEventId] = useState(events[0]?.id ?? "");
  const [gateLabel, setGateLabel] = useState("Porte VIP");
  const [gateLoading, setGateLoading] = useState(false);
  const [gateMsg, setGateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setGateSessions(scanSessions);
  }, [scanSessions]);

  useEffect(() => {
    if (events.length > 0 && !events.some((ev) => ev.id === gateEventId)) {
      setGateEventId(events[0]!.id);
    }
    if (events.length > 0 && !events.some((ev) => ev.id === vipEventId)) {
      setVipEventId(events[0]!.id);
    }
  }, [events, gateEventId, vipEventId]);

  // KYC form state
  const [kycEntity, setKycEntity] = useState<"INDIVIDUAL" | "COMPANY">("COMPANY");
  const [kycDocType, setKycDocType] = useState<"CNIB" | "PASSPORT" | "RCCM">("RCCM");
  const [kycDocRef, setKycDocRef] = useState("");
  const [kycMethod, setKycMethod] = useState<"MOBILE_MONEY" | "BANK">("MOBILE_MONEY");
  const [kycDest, setKycDest] = useState("");
  const [kycMsg, setKycMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Payout request state
  const [payoutAmount, setPayoutAmount] = useState(
    Math.min(100_000, Math.max(5_000, walletSummary.availableForPayoutXof)),
  );
  const [payoutMethod, setPayoutMethod] = useState<"MOBILE_MONEY" | "BANK">("MOBILE_MONEY");
  const [payoutDest, setPayoutDest] = useState(latestKyc?.payoutDestination ?? "");
  const [payoutMsg, setPayoutMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  async function handleIssueVip(e: React.FormEvent) {
    e.preventDefault();
    const targetEvt = events.find((ev) => ev.id === vipEventId);
    const tierId = targetEvt?.tiers[targetEvt.tiers.length - 1]?.id ?? targetEvt?.tiers[0]?.id;
    if (!targetEvt || !tierId) return;

    setVipLoading(true);
    setVipError(null);
    setVipTicket(null);
    try {
      const res = await fetch("/api/dashboard/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: targetEvt.id, tierId, guestName: vipGuestName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setVipError(data.error ?? "Impossible de générer l'invitation.");
      } else {
        setVipTicket(data.ticket);
        setVipGuestName("");
      }
    } catch {
      setVipError("Erreur réseau.");
    } finally {
      setVipLoading(false);
    }
  }

  async function handleCreateGate(e: React.FormEvent) {
    e.preventDefault();
    const targetEventId = gateEventId || events[0]?.id || "";
    if (!targetEventId || !gateLabel.trim()) {
      setGateMsg({ ok: false, text: "Sélectionnez un événement et indiquez le nom de la porte." });
      return;
    }
    setGateLoading(true);
    setGateMsg(null);
    try {
      const res = await fetch("/api/dashboard/scan-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: targetEventId, gateLabel: gateLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.scanSession) {
        setGateMsg({ ok: false, text: data.error ?? "Impossible de générer le code porte." });
        return;
      }
      const created = data.scanSession as ScanSessionView;
      setGateSessions((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      setGateLabel("");
      setGateMsg({
        ok: true,
        text: `Code porte créé : ${created.accessCode} (${created.gateLabel}). Partagez-le à votre agent d'accueil.`,
      });
      router.refresh();
    } catch {
      setGateMsg({ ok: false, text: "Erreur réseau lors de la création du code porte." });
    } finally {
      setGateLoading(false);
    }
  }

  async function handleRevokeGate(sessionId: string) {
    setGateMsg(null);
    try {
      const res = await fetch("/api/dashboard/scan-sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setGateSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, isRevoked: true } : s)),
        );
        setGateMsg({ ok: true, text: "Code d'accès porte révoqué." });
        router.refresh();
      }
    } catch {
      setGateMsg({ ok: false, text: "Erreur réseau lors de la révocation." });
    }
  }

  async function handleSubmitKyc(e: React.FormEvent) {
    e.preventDefault();
    setKycMsg(null);
    const res = await fetch("/api/dashboard/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalEntityType: kycEntity,
        documentType: kycDocType,
        documentReference: kycDocRef,
        payoutMethod: kycMethod,
        payoutDestination: kycDest,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setKycMsg({ ok: false, text: data.error ?? "Erreur de soumission KYC." });
    } else {
      setKycMsg({ ok: true, text: "Dossier KYC transmis ! Il est visible dans /admin pour validation." });
      setKycDocRef("");
      router.refresh();
    }
  }

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutLoading(true);
    setPayoutMsg(null);
    try {
      const res = await fetch("/api/dashboard/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountXof: Number(payoutAmount),
          method: payoutMethod,
          destination: payoutDest,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPayoutMsg({ ok: false, text: data.error ?? "Retrait refusé." });
      } else {
        setPayoutMsg({
          ok: true,
          text: `Demande de ${formatXof(data.payout.amountXof)} enregistrée (traitement sous ${PRICING_CONFIG.payoutSla.mobileMoneyLabel}).`,
        });
        router.refresh();
      }
    } finally {
      setPayoutLoading(false);
    }
  }

  return (
    <div className="mt-8">
      {/* Barre d'onglets accessible — défilement horizontal 1 ligne sur mobile */}
      <div
        role="tablist"
        aria-label="Sections de l'espace organisateur"
        className="no-scrollbar -mx-4 flex flex-nowrap gap-2 overflow-x-auto border-b border-slate-200 px-4 pb-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {[
          { id: "events" as const, label: "Événements & Création" },
          { id: "votes" as const, label: `Votes & Concours (${voteCampaigns.length})` },
          { id: "vip" as const, label: "Invitations VIP & Export CSV" },
          { id: "gates" as const, label: "Équipes Scan (Portes)" },
          { id: "finance" as const, label: "Portefeuille, KYC & Retraits" },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition sm:py-2.5 sm:text-sm ${
              activeTab === tab.id
                ? "bg-[#1B2A4A] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ONGLET 1 : ÉVÉNEMENTS & CRÉATION */}
      {activeTab === "events" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <OrganizerEventForm />
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
                Vos événements en ligne ({events.length})
              </h2>
              {events.length === 0 ? (
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
                  Vous n&apos;avez pas encore publié d&apos;événement. Remplissez le formulaire à
                  gauche pour mettre en ligne votre premier événement avec ses catégories de billets
                  (Pass Normal, VIP, Or...).
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {events.map((evt) => {
                    const avail = getEventAvailability(evt);
                    return (
                      <li key={evt.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/evenements/${evt.slug}`}
                            className="block truncate text-sm font-bold text-[#1B2A4A] hover:text-teal-700"
                          >
                            {evt.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {formatEventDate(evt.startsAt, evt.timezone)} · {evt.tiers.length}{" "}
                            tarif(s) · {avail.soldQty}/{avail.totalQty} vendus
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <a
                            href={`/api/dashboard/events/${evt.id}/export`}
                            title="Télécharger la liste CSV"
                            aria-label={`Exporter les participants de ${evt.title} en CSV`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </a>
                          <Link
                            href={`/evenements/${evt.slug}`}
                            aria-label={`Ouvrir ${evt.title}`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-[#1B2A4A]"
                          >
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 1B : VOTES & CONCOURS */}
      {activeTab === "votes" && (
        <div className="mt-6">
          <OrganizerVoteManager initialCampaigns={voteCampaigns} isAdmin={isAdmin} />
        </div>
      )}

      {/* ONGLET 2 : INVITATIONS VIP & EXPORT CSV */}
      {activeTab === "vip" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Gift className="h-5 w-5 text-teal-600" aria-hidden="true" />
              Émettre une invitation gratuite (VIP / Presse / Sponsor)
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Génère immédiatement un vrai billet nominatif avec QR code signé et code court,
              contrôlable à l&apos;entrée exactement comme un billet payant.
            </p>

            {vipError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {vipError}
              </p>
            )}

            {events.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                Publiez d&apos;abord un événement pour pouvoir générer des invitations VIP gratuites.
              </p>
            ) : (
              <form onSubmit={handleIssueVip} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="vip-event" className="block text-sm font-semibold text-slate-800">
                    Votre événement
                  </label>
                  <select
                    id="vip-event"
                    value={vipEventId}
                    onChange={(e) => setVipEventId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vip-guest" className="block text-sm font-semibold text-slate-800">
                    Nom complet de l&apos;invité *
                  </label>
                  <input
                    id="vip-guest"
                    type="text"
                    required
                    value={vipGuestName}
                    onChange={(e) => setVipGuestName(e.target.value)}
                    placeholder="Ex. Salif Koné (Presse)"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={vipLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
                >
                  {vipLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Générer l&apos;invitation QR
                </button>
              </form>
            )}

            {vipTicket && (
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                {vipTicket.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vipTicket.qrDataUrl}
                    alt={`QR Invitation ${vipTicket.shortCode}`}
                    width={96}
                    height={96}
                    className="rounded-lg bg-white p-1.5"
                  />
                )}
                <div className="text-xs text-teal-950">
                  <p className="font-bold">Invitation créée pour {vipTicket.attendeeName}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-teal-700">
                    {vipTicket.shortCode}
                  </p>
                  <Link
                    href={`/scan?eventId=${encodeURIComponent(vipTicket.eventId)}&code=${encodeURIComponent(vipTicket.qrPayload)}`}
                    className="mt-2 inline-block font-bold text-[#1B2A4A] underline"
                  >
                    Tester ce billet sur /scan →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Download className="h-5 w-5 text-teal-600" aria-hidden="true" />
              Export Excel / CSV des participants
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Téléchargez la liste à jour des billets émis (ventes + invitations VIP), incluant
              l&apos;heure exacte de scan et la porte de passage.
            </p>
            {events.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                Aucun événement à exporter pour le moment.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1B2A4A]">{ev.title}</p>
                      <p className="text-xs text-slate-500">
                        {ev.city} · {formatEventDate(ev.startsAt, ev.timezone)}
                      </p>
                    </div>
                    <a
                      href={`/api/dashboard/events/${ev.id}/export`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#1B2A4A] shadow-2xs ring-1 ring-slate-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Export CSV
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 3 : ÉQUIPES SCAN (CODES D'ACCÈS PORTE) */}
      {activeTab === "gates" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleCreateGate}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <KeyRound className="h-5 w-5 text-teal-600" aria-hidden="true" />
              Créer un accès agent de porte
            </h2>
            <p className="text-xs text-slate-600">
              Chaque code donne accès uniquement au contrôle des billets de votre événement choisi —
              zéro accès aux recettes ni aux réglages.
            </p>
            {gateMsg && (
              <p
                role="alert"
                className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                  gateMsg.ok
                    ? "border border-teal-200 bg-teal-50 text-teal-800"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {gateMsg.text}
              </p>
            )}
            {events.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                Publiez d&apos;abord votre premier événement pour créer des codes d&apos;accès porte
                pour vos agents d&apos;accueil.
              </p>
            ) : (
              <>
                <div>
                  <label htmlFor="gate-event" className="block text-sm font-semibold text-slate-800">
                    Votre événement
                  </label>
                  <select
                    id="gate-event"
                    value={gateEventId}
                    onChange={(e) => setGateEventId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gate-name" className="block text-sm font-semibold text-slate-800">
                    Nom de la porte *
                  </label>
                  <input
                    id="gate-name"
                    type="text"
                    required
                    value={gateLabel}
                    onChange={(e) => setGateLabel(e.target.value)}
                    placeholder="Ex. Entrée VIP Est"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={gateLoading}
                  className="rounded-xl bg-[#1B2A4A] px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
                >
                  Générer un code porte
                </button>
              </>
            )}
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
            <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
              Codes d&apos;accès porte actifs ({gateSessions.filter((s) => !s.isRevoked).length})
            </h2>
            {gateSessions.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
                Aucun code d&apos;accès porte généré pour le moment. Créez-en un à gauche pour
                permettre à vos agents de scanner les billets sans accéder à vos ventes.
              </p>
            ) : (
            <ul className="mt-4 space-y-3">
              {gateSessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                    s.isRevoked
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <p className="font-bold text-[#1B2A4A]">
                      {s.gateLabel}{" "}
                      <span className="ml-2 rounded-md bg-teal-50 px-2 py-0.5 font-mono text-xs text-teal-800">
                        {s.accessCode}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{s.eventTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.isRevoked ? (
                      <>
                        <Link
                          href={`/scan?accessCode=${encodeURIComponent(s.accessCode)}`}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700"
                        >
                          Ouvrir sur /scan
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleRevokeGate(s.id)}
                          aria-label={`Révoquer le code ${s.accessCode}`}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        Révoqué
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 4 : PORTEFEUILLE, KYC & RETRAITS */}
      {activeTab === "finance" && (
        <div className="mt-6 space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Demande de retrait */}
            <form
              onSubmit={handleRequestPayout}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
                  <Wallet className="h-5 w-5 text-teal-600" aria-hidden="true" />
                  Demander un reversement
                </h2>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Dispo : {formatXof(walletSummary.availableForPayoutXof)}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Traitement garanti sous <strong>{PRICING_CONFIG.payoutSla.mobileMoneyLabel}</strong>{" "}
                par Mobile Money ({PRICING_CONFIG.payoutSla.bankTransferLabel} par banque).
              </p>

              {payoutMsg && (
                <p
                  role="alert"
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                    payoutMsg.ok ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {payoutMsg.text}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="payout-amount" className="block text-xs font-bold text-slate-700 uppercase">
                    Montant (FCFA, min 5 000)
                  </label>
                  <input
                    id="payout-amount"
                    type="number"
                    min={5000}
                    step={500}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="payout-method" className="block text-xs font-bold text-slate-700 uppercase">
                    Canal
                  </label>
                  <select
                    id="payout-method"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as "MOBILE_MONEY" | "BANK")}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
                  >
                    <option value="MOBILE_MONEY">Mobile Money (48 h ouvrées)</option>
                    <option value="BANK">Virement bancaire (3–5 j ouvrés)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="payout-dest" className="block text-xs font-bold text-slate-700 uppercase">
                  Numéro Mobile Money ou RIB vérifié
                </label>
                <input
                  id="payout-dest"
                  type="text"
                  required
                  value={payoutDest}
                  onChange={(e) => setPayoutDest(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={payoutLoading || walletSummary.availableForPayoutXof < 5000}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40"
              >
                {payoutLoading ? "Envoi..." : "Envoyer la demande de retrait"}
              </button>
            </form>

            {/* Dossier KYC */}
            <form
              onSubmit={handleSubmitKyc}
              className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
                  <ShieldCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
                  Vérification d&apos;identité (KYC)
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                    latestKyc?.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : latestKyc?.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {latestKyc?.status === "APPROVED" && (
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {latestKyc?.status === "APPROVED"
                    ? "Validé"
                    : latestKyc?.status === "PENDING"
                      ? "En cours de revue"
                      : latestKyc?.status === "REJECTED"
                        ? "À corriger"
                        : "Non soumis"}
                </span>
              </div>

              {kycMsg && (
                <p
                  role="alert"
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                    kycMsg.ok ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {kycMsg.text}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-entity" className="block text-xs font-bold text-slate-700 uppercase">
                    Statut juridique
                  </label>
                  <select
                    id="kyc-entity"
                    value={kycEntity}
                    onChange={(e) => setKycEntity(e.target.value as "INDIVIDUAL" | "COMPANY")}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="COMPANY">Société / Association</option>
                    <option value="INDIVIDUAL">Organisateur individuel</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kyc-doctype" className="block text-xs font-bold text-slate-700 uppercase">
                    Pièce fournie
                  </label>
                  <select
                    id="kyc-doctype"
                    value={kycDocType}
                    onChange={(e) => setKycDocType(e.target.value as "CNIB" | "PASSPORT" | "RCCM")}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="RCCM">RCCM / Récépissé</option>
                    <option value="CNIB">CNIB / Carte d&apos;identité</option>
                    <option value="PASSPORT">Passeport</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-ref" className="block text-xs font-bold text-slate-700 uppercase">
                    Référence document *
                  </label>
                  <input
                    id="kyc-ref"
                    type="text"
                    required
                    value={kycDocRef}
                    onChange={(e) => setKycDocRef(e.target.value)}
                    placeholder="Ex. BF-OUA-2025-B-1234"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="kyc-dest" className="block text-xs font-bold text-slate-700 uppercase">
                    Compte de réception *
                  </label>
                  <input
                    id="kyc-dest"
                    type="text"
                    required
                    value={kycDest}
                    onChange={(e) => setKycDest(e.target.value)}
                    placeholder="Wave / Orange Money +226..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                onClick={() => setKycMethod("MOBILE_MONEY")}
                className="rounded-xl bg-[#1B2A4A] px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
              >
                Soumettre / Mettre à jour mon KYC
              </button>
            </form>
          </div>

          {/* Historique Grand Livre + Retraits */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-[#1B2A4A]">
                Grand livre comptable immuable ({ledgerEntries.length} écritures)
              </h3>
              <ul className="mt-3 divide-y divide-slate-100 text-xs">
                {ledgerEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-semibold text-slate-800">{entry.label}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(entry.createdAt).toLocaleString("fr-FR")} · {entry.entryType}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono font-bold ${
                        entry.amountXof >= 0 ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {entry.amountXof >= 0 ? "+" : "−"}
                      {formatXof(Math.abs(entry.amountXof))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="font-display text-base font-bold text-[#1B2A4A]">
                Suivi de vos reversements ({payouts.length})
              </h3>
              {payouts.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">Aucune demande de retrait pour le moment.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 text-xs">
                  {payouts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="font-bold text-[#1B2A4A]">
                          {formatXof(p.amountXof)} · {p.destination}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Demandé le {new Date(p.requestedAt).toLocaleString("fr-FR")}
                          {p.externalReference ? ` · Réf. ${p.externalReference}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status === "COMPLETED"
                          ? "Viré"
                          : p.status === "REJECTED"
                            ? "Rejeté"
                            : "En attente"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

