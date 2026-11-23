"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Percent,
  PlusCircle,
  Shield,
  ShieldCheck,
  Star,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { OrganizerEventForm } from "@/components/OrganizerEventForm";
import { formatEventDate, formatXof } from "@/config/uemoa";
import type { ConfiguredSuperAdminSummary } from "@/modules/auth/store";
import type { EventView } from "@/modules/events/types";
import type {
  AuditLogView,
  KycSubmissionView,
  PayoutRequestView,
} from "@/modules/operations/store";

export interface AdminPlatformKpis {
  totalEvents: number;
  totalOrganizers: number;
  verifiedOrganizers: number;
  totalTicketsSold: number;
  totalGrossSalesXof: number;
  totalJaverooCommissionXof: number;
  totalOrganizerNetXof: number;
  commissionPercent: number;
  pendingKycCount: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmountXof: number;
}

export interface AdminOrganizerRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  isVerified: boolean;
  supportPhone: string;
  supportEmail: string;
  eventsCount: number;
  ticketsSold: number;
  grossSalesXof: number;
  javerooCommissionXof: number;
  kycStatus: "PENDING" | "APPROVED" | "REJECTED" | "NONE";
}

interface AdminConsoleProps {
  currentAdminEmail: string;
  kpis: AdminPlatformKpis;
  kycSubmissions: KycSubmissionView[];
  payouts: PayoutRequestView[];
  organizers: AdminOrganizerRow[];
  events: EventView[];
  auditLogs: AuditLogView[];
  superAdmins: ConfiguredSuperAdminSummary[];
}

type AdminTab = "ops" | "promoters" | "catalog" | "team";

export function AdminConsole({
  currentAdminEmail,
  kpis,
  kycSubmissions,
  payouts,
  organizers,
  events,
  auditLogs,
  superAdmins,
}: AdminConsoleProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("ops");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  async function handleKyc(kycId: string, decision: "APPROVED" | "REJECTED") {
    setBusyId(kycId);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kycId,
          decision,
          rejectionReason:
            decision === "REJECTED"
              ? "Document illisible ou incomplet, merci de renvoyer."
              : undefined,
        }),
      });
      if (res.ok) {
        setBanner(
          decision === "APPROVED"
            ? "Dossier KYC validé : le badge vérifié et les retraits sont activés."
            : "Dossier KYC rejeté et journalisé.",
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handlePayout(payoutId: string, decision: "COMPLETED" | "REJECTED") {
    setBusyId(payoutId);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId,
          decision,
          rejectionReason: decision === "REJECTED" ? "Coordonnées à vérifier" : undefined,
        }),
      });
      if (res.ok) {
        setBanner(
          decision === "COMPLETED"
            ? "Virement marqué comme exécuté avec référence enregistrée."
            : "Demande rejetée : le solde disponible a été automatiquement recrédité dans le grand livre.",
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleFeatured(eventId: string) {
    setBusyId(eventId);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        setBanner("Mise en avant mise à jour sur la page d'accueil.");
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs financiers globaux Javeroo */}
      <section aria-label="Indicateurs globaux plateforme" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Volume brut (GMV)</span>
            <TrendingUp className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {formatXof(kpis.totalGrossSalesXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {kpis.totalTicketsSold.toLocaleString("fr-FR")} billet(s) · {kpis.totalEvents} événement(s)
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800 uppercase">
            <span>Commissions Javeroo ({kpis.commissionPercent} %)</span>
            <Percent className="h-4 w-4 text-indigo-700" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-indigo-950">
            {formatXof(kpis.totalJaverooCommissionXof)}
          </p>
          <p className="mt-1 text-xs text-indigo-800/80">
            Net promoteurs : {formatXof(kpis.totalOrganizerNetXof)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Promoteurs &amp; KYC</span>
            <Building2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {kpis.verifiedOrganizers} / {kpis.totalOrganizers} vérifiés
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {kpis.pendingKycCount > 0
              ? `${kpis.pendingKycCount} dossier(s) KYC à valider`
              : "Aucun dossier KYC en attente"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Reversements en attente</span>
            <Wallet className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-[#1B2A4A]">
            {formatXof(kpis.pendingPayoutsAmountXof)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {kpis.pendingPayoutsCount} demande(s) à traiter sous 48 h
          </p>
        </div>
      </section>

      {/* Barre d'onglets SuperAdmin */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3" role="tablist">
        {(
          [
            {
              id: "ops",
              label: `KYC & Reversements (${kpis.pendingKycCount + kpis.pendingPayoutsCount})`,
              icon: Shield,
            },
            {
              id: "promoters",
              label: `Promoteurs & Gestion déléguée (${organizers.length})`,
              icon: PlusCircle,
            },
            {
              id: "catalog",
              label: `Catalogue & À la une (${events.length})`,
              icon: Star,
            },
            {
              id: "team",
              label: `Équipe SuperAdmin (${superAdmins.length}) & Audit`,
              icon: Users,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-[#1B2A4A] text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {banner && (
        <div
          role="status"
          className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
        >
          {banner}
        </div>
      )}

      {/* ONGLET 1 : KYC & Reversements */}
      {activeTab === "ops" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Validation des dossiers KYC ({kycSubmissions.length})
            </h2>
            <div className="mt-4 space-y-3">
              {kycSubmissions.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
                  Aucun dossier KYC déposé pour le moment.
                </p>
              ) : (
                kycSubmissions.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="text-sm">
                      <p className="font-bold text-[#1B2A4A]">
                        {k.organizationName}{" "}
                        <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {k.documentType} · {k.documentReference}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Reversement : {k.payoutDestination} · Soumis le{" "}
                        {new Date(k.submittedAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === k.id}
                            onClick={() => void handleKyc(k.id, "APPROVED")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Approuver
                          </button>
                          <button
                            type="button"
                            disabled={busyId === k.id}
                            onClick={() => void handleKyc(k.id, "REJECTED")}
                            className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Rejeter
                          </button>
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            k.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {k.status === "APPROVED" && (
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {k.status === "APPROVED" ? "Approuvé" : "Rejeté"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Wallet className="h-5 w-5 text-teal-600" aria-hidden="true" />
              File des reversements organisateurs ({payouts.length})
            </h2>
            <div className="mt-4 space-y-3">
              {payouts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
                  Aucune demande de reversement en attente.
                </p>
              ) : (
                payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-bold text-[#1B2A4A]">
                        {formatXof(p.amountXof)} — {p.organizationName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {p.method} · {p.destination}
                        {p.externalReference ? ` · Réf. ${p.externalReference}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === "REQUESTED" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void handlePayout(p.id, "COMPLETED")}
                            className="rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50"
                          >
                            Confirmer virement
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void handlePayout(p.id, "REJECTED")}
                            className="rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Rejeter &amp; recréditer
                          </button>
                        </>
                      ) : (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            p.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.status === "COMPLETED" ? "Viré" : "Rejeté (recrédité)"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* ONGLET 2 : Annuaire des promoteurs & Publication déléguée */}
      {activeTab === "promoters" && (
        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Building2 className="h-5 w-5 text-teal-600" aria-hidden="true" />
              Annuaire des promoteurs ({organizers.length})
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Vue consolidée des organisateurs enregistrés, de leur volume de billetterie et de la
              commission Javeroo ({kpis.commissionPercent} %) générée.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase">
                    <th className="py-2.5 pr-3">Promoteur</th>
                    <th className="py-2.5 pr-3">Ville / Pays</th>
                    <th className="py-2.5 pr-3">KYC</th>
                    <th className="py-2.5 pr-3 text-right">Événements</th>
                    <th className="py-2.5 pr-3 text-right">Billets</th>
                    <th className="py-2.5 pr-3 text-right">Brut</th>
                    <th className="py-2.5 pr-3 text-right">Comm. 8 %</th>
                    <th className="py-2.5 text-right">Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizers.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3">
                        <p className="font-bold text-[#1B2A4A]">{org.name}</p>
                        {(org.supportPhone || org.supportEmail) && (
                          <p className="text-[11px] text-slate-500">
                            {[org.supportPhone, org.supportEmail].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-slate-700">
                        {org.city} ({org.countryCode})
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            org.isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : org.kycStatus === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {org.isVerified
                            ? "Vérifié"
                            : org.kycStatus === "PENDING"
                              ? "En attente"
                              : "Non soumis"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-slate-800">
                        {org.eventsCount}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-slate-800">
                        {org.ticketsSold.toLocaleString("fr-FR")}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-[#1B2A4A]">
                        {formatXof(org.grossSalesXof)}
                      </td>
                      <td className="py-3 pr-3 text-right font-bold text-indigo-700">
                        {formatXof(org.javerooCommissionXof)}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/promoteurs/${org.slug}`}
                          className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                        >
                          Voir
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Création d'événement au nom d'un promoteur (Conciergerie Équipe Javeroo) */}
          <OrganizerEventForm
            delegatedOrganizers={organizers.map((o) => ({
              id: o.id,
              name: o.name,
              city: o.city,
              countryCode: o.countryCode,
            }))}
          />
        </div>
      )}

      {/* ONGLET 3 : Modération catalogue & À la une */}
      {activeTab === "catalog" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
            <Star className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Modération du catalogue &amp; sélection « À la une » ({events.length})
          </h2>
          <ul className="mt-4 divide-y divide-slate-100 text-xs">
            {events.map((evt) => {
              const sold = evt.tiers.reduce((s, t) => s + t.soldQty, 0);
              const total = evt.tiers.reduce((s, t) => s + t.totalQty, 0);
              return (
                <li
                  key={evt.id}
                  className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1B2A4A]">{evt.title}</p>
                    <p className="mt-0.5 text-slate-600">
                      <strong>{evt.organizer.name}</strong> · {evt.city} ({evt.countryCode}) ·{" "}
                      {formatEventDate(evt.startsAt, evt.timezone)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <Ticket className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                      {evt.tiers.length} catégorie(s) · {sold}/{total} vendus
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/evenements/${evt.slug}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ouvrir la fiche
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === evt.id}
                      onClick={() => void handleToggleFeatured(evt.id)}
                      className={`rounded-lg px-3 py-1.5 font-bold ${
                        evt.isFeatured
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {evt.isFeatured ? "★ À la une" : "Mettre en avant"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ONGLET 4 : Équipe SuperAdmin & Journal d'audit */}
      {activeTab === "team" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <ShieldCheck className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              Comptes SuperAdmin actifs ({superAdmins.length})
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Les accès SuperAdmin de production se configurent directement dans Vercel via les
              variables{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">SUPER_ADMIN_1_*</code>,{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">SUPER_ADMIN_2_*</code> (jusqu&apos;à
              10 membres).
            </p>
            <ul className="mt-4 divide-y divide-slate-100 text-xs">
              {superAdmins.map((admin) => {
                const isSelf = admin.email.toLowerCase() === currentAdminEmail.toLowerCase();
                return (
                  <li key={admin.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-bold text-[#1B2A4A]">
                        {admin.fullName}{" "}
                        {isSelf && (
                          <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                            Vous
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {admin.email}
                        {admin.phone ? ` · ${admin.phone}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        admin.source === "env"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {admin.source === "env" ? "Variable Vercel" : "Compte démo"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <ClipboardList className="h-5 w-5 text-slate-600" aria-hidden="true" />
              Journal d&apos;audit immuable ({auditLogs.length})
            </h2>
            <ul className="mt-4 divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <li key={log.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-indigo-700">{log.action}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    {log.target} <span className="font-normal text-slate-500">par {log.actor}</span>
                  </p>
                  <p className="text-slate-600">{log.details}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
