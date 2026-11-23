"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  Globe,
  HardDrive,
  LayoutDashboard,
  MapPin,
  Percent,
  PlusCircle,
  QrCode,
  Receipt,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Ticket,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { OrganizerEventForm } from "@/components/OrganizerEventForm";
import { OrganizerVoteManager } from "@/components/OrganizerVoteManager";
import { formatEventDate, formatXof, PAYMENT_METHODS, UEMOA_COUNTRIES } from "@/config/uemoa";
import type { ConfiguredSuperAdminSummary } from "@/modules/auth/store";
import type { EventView, OrderView } from "@/modules/events/types";
import type { LedgerEntryRecord } from "@/modules/ledger/service";
import type {
  AuditLogView,
  KycSubmissionView,
  PayoutRequestView,
} from "@/modules/operations/store";
import type { VoteCampaignView, VoteTransactionView } from "@/modules/votes/types";

export interface AdminPlatformKpis {
  totalEvents: number;
  featuredEventsCount: number;
  totalOrganizers: number;
  verifiedOrganizers: number;
  totalTicketsSold: number;
  totalCapacity: number;
  averageFillRatePercent: number;
  totalGrossSalesXof: number;
  totalJaverooCommissionXof: number;
  totalOrganizerNetXof: number;
  commissionPercent: number;
  pendingKycCount: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmountXof: number;
  completedPayoutsAmountXof: number;
  liveOrdersCount: number;
  activeScanGatesCount: number;
  voteCampaignsCount: number;
  openVoteCampaignsCount: number;
  totalVotesCount: number;
  totalVotesGrossXof: number;
  totalVotesCommissionXof: number;
}

export interface AdminCountryStat {
  countryCode: string;
  countryName: string;
  eventsCount: number;
  ticketsSold: number;
  grossSalesXof: number;
  javerooCommissionXof: number;
}

export interface AdminCategoryStat {
  categoryId: string;
  label: string;
  eventsCount: number;
  ticketsSold: number;
  grossSalesXof: number;
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

export interface AdminSystemStatus {
  environment: string;
  region: string;
  databaseConfigured: boolean;
  blobStorageConfigured: boolean;
  paymentProvider: string;
  secretsConfigured: boolean;
  demoAccountsEnabled: boolean;
}

interface AdminConsoleProps {
  currentAdmin: {
    fullName: string;
    email: string;
  };
  kpis: AdminPlatformKpis;
  countryStats: AdminCountryStat[];
  categoryStats: AdminCategoryStat[];
  kycSubmissions: KycSubmissionView[];
  payouts: PayoutRequestView[];
  ledgerEntries: LedgerEntryRecord[];
  organizers: AdminOrganizerRow[];
  events: EventView[];
  orders: OrderView[];
  voteCampaigns: VoteCampaignView[];
  voteTransactions: VoteTransactionView[];
  auditLogs: AuditLogView[];
  superAdmins: ConfiguredSuperAdminSummary[];
  systemStatus: AdminSystemStatus;
}

type AdminSection = "overview" | "votes" | "orders" | "catalog" | "promoters" | "finance" | "system";

const SECTION_META: Record<AdminSection, { title: string; subtitle: string }> = {
  overview: {
    title: "Vue globale de la plateforme",
    subtitle: "Indicateurs consolidés Billetterie + Votes, performances par pays UEMOA et alertes prioritaires.",
  },
  votes: {
    title: "Votes & Concours payants",
    subtitle: "Pilotez tous les concours UEMOA (Miss, Awards, Musique), encaissements Mobile Money et campagnes déléguées.",
  },
  orders: {
    title: "Commandes & Transactions",
    subtitle: "Suivi en temps réel des billets émis, montants encaissés et commissions Javeroo.",
  },
  catalog: {
    title: "Catalogue & Modération",
    subtitle: "Supervisez tous les événements, taux de remplissage, mise à la une et accès scan.",
  },
  promoters: {
    title: "Promoteurs & Gestion déléguée",
    subtitle: "Annuaire des organisateurs partenaires et publication d'événements en mode conciergerie.",
  },
  finance: {
    title: "Finances, KYC & Reversements",
    subtitle: "Validation d'identité, virements organisateurs sous 48 h et grand livre comptable global.",
  },
  system: {
    title: "Équipe SuperAdmin, Système & Audit",
    subtitle: "Membres habilités, santé de l'infrastructure Vercel et journal d'audit immuable.",
  },
};

export function AdminConsole({
  currentAdmin,
  kpis,
  countryStats,
  categoryStats,
  kycSubmissions,
  payouts,
  ledgerEntries,
  organizers,
  events,
  orders,
  voteCampaigns,
  voteTransactions,
  auditLogs,
  superAdmins,
  systemStatus,
}: AdminConsoleProps) {
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>("overview");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Filtres interactifs
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCountry, setCatalogCountry] = useState("ALL");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [orderSearch, setOrderSearch] = useState("");
  const [promoterSearch, setPromoterSearch] = useState("");
  const [selectedOrgForForm, setSelectedOrgForForm] = useState<string | undefined>(undefined);
  const delegatedFormRef = useRef<HTMLDivElement | null>(null);

  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | "TICKET_SALE" | "PLATFORM_COMMISSION" | "PAYOUT">("ALL");
  const [auditSearch, setAuditSearch] = useState("");

  const urgentCount = kpis.pendingKycCount + kpis.pendingPayoutsCount;

  const topEvents = useMemo(() => {
    return [...events]
      .map((evt) => {
        const sold = evt.tiers.reduce((s, t) => s + t.soldQty, 0);
        const total = evt.tiers.reduce((s, t) => s + t.totalQty, 0);
        const gross = evt.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0);
        const commission = Math.round((gross * evt.commissionBps) / 10_000);
        const fillPercent = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
        return { evt, sold, total, gross, commission, fillPercent };
      })
      .sort((a, b) => b.gross - a.gross || b.sold - a.sold)
      .slice(0, 6);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return events.filter((evt) => {
      if (catalogCountry !== "ALL" && evt.countryCode !== catalogCountry) return false;
      if (featuredOnly && !evt.isFeatured) return false;
      if (!q) return true;
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.city.toLowerCase().includes(q) ||
        evt.organizer.name.toLowerCase().includes(q) ||
        evt.venueName.toLowerCase().includes(q)
      );
    });
  }, [events, catalogSearch, catalogCountry, featuredOnly]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.publicToken.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.buyerPhone.toLowerCase().includes(q) ||
        o.eventTitle.toLowerCase().includes(q),
    );
  }, [orders, orderSearch]);

  const filteredOrganizers = useMemo(() => {
    const q = promoterSearch.trim().toLowerCase();
    if (!q) return organizers;
    return organizers.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.city.toLowerCase().includes(q) ||
        org.countryCode.toLowerCase().includes(q),
    );
  }, [organizers, promoterSearch]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === "ALL") return ledgerEntries;
    if (ledgerFilter === "PAYOUT") {
      return ledgerEntries.filter((e) => e.entryType.startsWith("PAYOUT"));
    }
    return ledgerEntries.filter((e) => e.entryType === ledgerFilter);
  }, [ledgerEntries, ledgerFilter]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q),
    );
  }, [auditLogs, auditSearch]);

  const maxCountryGross = Math.max(1, ...countryStats.map((c) => c.grossSalesXof));
  const maxCatGross = Math.max(1, ...categoryStats.map((c) => c.grossSalesXof));

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
        setBanner({
          kind: "ok",
          text:
            decision === "APPROVED"
              ? "Dossier KYC validé : le badge vérifié et les retraits sont activés."
              : "Dossier KYC rejeté et journalisé.",
        });
        router.refresh();
      } else {
        setBanner({ kind: "error", text: "Impossible de mettre à jour ce dossier KYC." });
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
        setBanner({
          kind: "ok",
          text:
            decision === "COMPLETED"
              ? "Virement marqué comme exécuté avec référence enregistrée."
              : "Demande rejetée : le solde disponible a été recrédité dans le grand livre.",
        });
        router.refresh();
      } else {
        setBanner({ kind: "error", text: "Impossible de traiter ce reversement." });
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
        setBanner({ kind: "ok", text: "Sélection « À la une » mise à jour sur l'accueil." });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setBusyId(eventId);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        setBanner({ kind: "ok", text: "Événement retiré du catalogue et journalisé." });
        router.refresh();
      } else {
        setBanner({ kind: "error", text: "Impossible de retirer cet événement." });
      }
    } finally {
      setBusyId(null);
    }
  }

  function jumpToDelegatedCreate(orgId?: string) {
    setSelectedOrgForForm(orgId ?? "__new__");
    setSection("promoters");
    window.setTimeout(() => {
      delegatedFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: typeof BarChart3;
    badge?: number | string;
    badgeTone?: "amber" | "indigo" | "slate";
  }> = [
    { id: "overview", label: "Vue globale", icon: BarChart3 },
    {
      id: "votes",
      label: "Votes & Concours",
      icon: Trophy,
      badge: kpis.voteCampaignsCount,
      badgeTone: "indigo",
    },
    {
      id: "orders",
      label: "Commandes & Billets",
      icon: Receipt,
      badge: kpis.liveOrdersCount > 0 ? kpis.liveOrdersCount : undefined,
      badgeTone: "indigo",
    },
    {
      id: "catalog",
      label: "Catalogue & Événements",
      icon: Calendar,
      badge: kpis.totalEvents,
      badgeTone: "slate",
    },
    {
      id: "promoters",
      label: "Promoteurs & Conciergerie",
      icon: Building2,
      badge: kpis.totalOrganizers,
      badgeTone: "slate",
    },
    {
      id: "finance",
      label: "Finances, KYC & Retraits",
      icon: Wallet,
      badge: urgentCount > 0 ? urgentCount : undefined,
      badgeTone: "amber",
    },
    {
      id: "system",
      label: "Équipe, Système & Audit",
      icon: Server,
      badge: superAdmins.length,
      badgeTone: "slate",
    },
  ];

  const pendingKycList = kycSubmissions.filter((k) => k.status === "PENDING");
  const pendingPayoutList = payouts.filter((p) => p.status === "REQUESTED");

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-100/80">
      <div className="flex w-full flex-col lg:flex-row">
        {/* SIDEBAR EXÉCUTIVE SUPERADMIN (Desktop) */}
        <aside className="hidden w-72 shrink-0 flex-col justify-between bg-[#0F1B33] text-slate-200 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)]">
          <div className="overflow-y-auto p-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-teal-300 uppercase">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  SuperAdmin HQ
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  UEMOA
                </span>
              </div>
              <p className="mt-2 truncate font-display text-sm font-bold text-white">
                {currentAdmin.fullName}
              </p>
              <p className="truncate font-mono text-[11px] text-slate-400">{currentAdmin.email}</p>
            </div>

            <nav aria-label="Menu SuperAdmin" className="mt-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                      active
                        ? "bg-teal-500 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-slate-950/20 text-slate-950"
                            : item.badgeTone === "amber"
                              ? "bg-amber-400/20 text-amber-300"
                              : item.badgeTone === "indigo"
                                ? "bg-indigo-400/20 text-indigo-200"
                                : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Raccourcis opérationnels
              </p>
              <div className="mt-2 space-y-1">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                    Vue globale /dashboard
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </Link>
                <Link
                  href="/scan"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                    Console Scan porte
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </Link>
                <Link
                  href="/evenements"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/8 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
                    Catalogue public
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 p-4 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300">
              Modèle : 0 % gratuit · {kpis.commissionPercent} % payant
            </p>
            <p className="mt-0.5">
              Env : <span className="font-mono text-teal-300">{systemStatus.environment}</span> ·{" "}
              {systemStatus.databaseConfigured ? "PostgreSQL actif" : "Mode démo Vercel"}
            </p>
          </div>
        </aside>

        {/* BARRE MOBILE SUPERADMIN */}
        <div className="border-b border-slate-800 bg-[#0F1B33] px-4 py-3 text-white lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-teal-300 uppercase">
                SuperAdmin HQ · {currentAdmin.fullName}
              </p>
              <p className="font-mono text-[11px] text-slate-400">{currentAdmin.email}</p>
            </div>
            <button
              type="button"
              onClick={() => jumpToDelegatedCreate()}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-slate-950"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Publier
            </button>
          </div>
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    active ? "bg-teal-500 text-slate-950" : "bg-white/10 text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ZONE PRINCIPALE DE CONTENU */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
          {/* Top Command Header */}
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1B2A4A]">
                {SECTION_META[section].title}
              </h1>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                {SECTION_META[section].subtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {urgentCount > 0 && section !== "finance" && (
                <button
                  type="button"
                  onClick={() => setSection("finance")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  {urgentCount} action{urgentCount > 1 ? "s" : ""} urgente
                  {urgentCount > 1 ? "s" : ""}
                </button>
              )}
              <button
                type="button"
                onClick={() => jumpToDelegatedCreate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-teal-600"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Publier pour un promoteur
              </button>
            </div>
          </header>

          {banner && (
            <div
              role="status"
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                banner.kind === "ok"
                  ? "border-teal-200 bg-teal-50 text-teal-900"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {banner.text}
            </div>
          )}

          {/* ================================================================= */}
          {/* 1. VUE GLOBALE (EXECUTIVE OVERVIEW)                               */}
          {/* ================================================================= */}
          {section === "overview" && (
            <div className="space-y-6">
              {/* 4 Cartes KPI Premium — grille exacte 2x2 sur mobile -> 4 cols sur desktop */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Volume Brut (GMV)
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-2xl font-extrabold text-[#1B2A4A]">
                    {formatXof(kpis.totalGrossSalesXof + kpis.totalVotesGrossXof)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-teal-700">
                    Billets {formatXof(kpis.totalGrossSalesXof)} · Votes{" "}
                    {formatXof(kpis.totalVotesGrossXof)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${kpis.averageFillRatePercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-teal-700">
                      {kpis.averageFillRatePercent} % rempli
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-[#1B2A4A] to-[#283E6B] p-3.5 text-white shadow-sm sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-teal-300 uppercase">
                      Revenus Javeroo ({kpis.commissionPercent} %)
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-teal-300">
                      <Percent className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-2xl font-extrabold text-white">
                    {formatXof(kpis.totalJaverooCommissionXof + kpis.totalVotesCommissionXof)}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    Dont <strong className="text-teal-300">{formatXof(kpis.totalVotesCommissionXof)}</strong>{" "}
                    en votes · {kpis.totalVotesCount.toLocaleString("fr-FR")} voix
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Billets &amp; Catalogue
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                      <Ticket className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-2xl font-extrabold text-[#1B2A4A]">
                    {kpis.totalTicketsSold.toLocaleString("fr-FR")}{" "}
                    <span className="text-sm font-semibold text-slate-400">
                      / {kpis.totalCapacity.toLocaleString("fr-FR")}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    <strong>{kpis.totalEvents}</strong> événements ·{" "}
                    <strong>{kpis.totalOrganizers}</strong> promoteurs ({kpis.verifiedOrganizers}{" "}
                    vérifiés)
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Reversements 48 h &amp; KYC
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <Wallet className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-2xl font-extrabold text-[#1B2A4A]">
                    {formatXof(kpis.pendingPayoutsAmountXof)}
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-bold text-amber-700">
                      {kpis.pendingPayoutsCount} virement(s)
                    </span>{" "}
                    ·{" "}
                    <span className="font-bold text-indigo-700">
                      {kpis.pendingKycCount} KYC en attente
                    </span>
                  </p>
                </div>
              </div>

              {/* Grille Analytique 12 colonnes (Pays UEMOA + Priorités & Catégories) */}
              <div className="grid gap-6 xl:grid-cols-12">
                {/* Performance par pays UEMOA */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs xl:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                        <Globe className="h-4 w-4 text-teal-600" aria-hidden="true" />
                        Performance par pays UEMOA
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Volume brut, billets écoulés et commission Javeroo 8 % par marché
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                      {countryStats.length} pays actif{countryStats.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {countryStats.map((c) => {
                      const pct = Math.max(6, Math.round((c.grossSalesXof / maxCountryGross) * 100));
                      return (
                        <div key={c.countryCode} className="space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-bold text-[#1B2A4A]">
                              <span className="mr-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                                {c.countryCode}
                              </span>
                              {c.countryName}
                              <span className="ml-2 font-normal text-slate-500">
                                {c.eventsCount} év. · {c.ticketsSold.toLocaleString("fr-FR")} billets
                              </span>
                            </span>
                            <span className="shrink-0 font-bold text-[#1B2A4A]">
                              {formatXof(c.grossSalesXof)}{" "}
                              <span className="font-semibold text-indigo-700">
                                ({formatXof(c.javerooCommissionXof)} comm.)
                              </span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#1B2A4A] to-teal-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Colonne droite : Priorités du jour + Catégories */}
                <div className="space-y-6 xl:col-span-5">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                        <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        Priorités opérationnelles
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection("finance")}
                        className="text-xs font-bold text-teal-700 hover:underline"
                      >
                        Tout traiter →
                      </button>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {pendingKycList.length === 0 && pendingPayoutList.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Tout est à jour : aucun KYC ni reversement en attente.
                        </div>
                      ) : (
                        <>
                          {pendingKycList.slice(0, 2).map((k) => (
                            <div
                              key={k.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#1B2A4A]">
                                  KYC · {k.organizationName}
                                </p>
                                <p className="text-[11px] text-slate-600">
                                  {k.documentType} ({k.documentReference})
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={busyId === k.id}
                                onClick={() => void handleKyc(k.id, "APPROVED")}
                                className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                              >
                                Valider
                              </button>
                            </div>
                          ))}
                          {pendingPayoutList.slice(0, 2).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#1B2A4A]">
                                  Retrait · {formatXof(p.amountXof)}
                                </p>
                                <p className="truncate text-[11px] text-slate-600">
                                  {p.organizationName} · {p.destination}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={busyId === p.id}
                                onClick={() => void handlePayout(p.id, "COMPLETED")}
                                className="shrink-0 rounded-lg bg-[#1B2A4A] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-teal-600"
                              >
                                Virer
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h2 className="font-display text-base font-bold text-[#1B2A4A]">
                      Répartition par catégorie
                    </h2>
                    <div className="mt-3.5 space-y-2.5">
                      {categoryStats.map((cat) => {
                        const pct = Math.max(8, Math.round((cat.grossSalesXof / maxCatGross) * 100));
                        return (
                          <div key={cat.categoryId} className="text-xs">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-700">
                                {cat.label}{" "}
                                <span className="text-slate-400">({cat.eventsCount})</span>
                              </span>
                              <span className="font-bold text-[#1B2A4A]">
                                {formatXof(cat.grossSalesXof)}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              {/* Top événements par recettes & remplissage */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-[#1B2A4A]">
                      Top événements par performance billetterie
                    </h2>
                    <p className="text-xs text-slate-500">
                      Classement par chiffre d&apos;affaires brut, taux de remplissage et revenu Javeroo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection("catalog")}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Voir tout le catalogue ({events.length}) →
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                        <th className="py-2.5 pr-3">Événement &amp; Promoteur</th>
                        <th className="py-2.5 pr-3">Ville</th>
                        <th className="py-2.5 pr-3">Remplissage</th>
                        <th className="py-2.5 pr-3 text-right">Volume brut</th>
                        <th className="py-2.5 pr-3 text-right">Comm. 8 %</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topEvents.map(({ evt, sold, total, gross, commission, fillPercent }) => (
                        <tr key={evt.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-3">
                            <p className="font-bold text-[#1B2A4A]">{evt.title}</p>
                            <p className="text-[11px] text-slate-500">{evt.organizer.name}</p>
                          </td>
                          <td className="py-3 pr-3 text-slate-700">
                            {evt.city} ({evt.countryCode})
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-teal-500"
                                  style={{ width: `${fillPercent}%` }}
                                />
                              </div>
                              <span className="font-semibold text-slate-700">
                                {sold}/{total} ({fillPercent}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-[#1B2A4A]">
                            {formatXof(gross)}
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-indigo-700">
                            {formatXof(commission)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Link
                                href={`/evenements/${evt.slug}`}
                                className="font-semibold text-teal-700 hover:underline"
                              >
                                Fiche
                              </Link>
                              <Link
                                href={`/scan?eventId=${encodeURIComponent(evt.id)}`}
                                className="font-semibold text-slate-600 hover:text-[#1B2A4A]"
                              >
                                Scan
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Activité récente : Commandes & Audit côte à côte */}
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                      <Receipt className="h-4 w-4 text-teal-600" aria-hidden="true" />
                      Dernières commandes en direct ({orders.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSection("orders")}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Tout voir →
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                      Aucune commande live enregistrée dans cette session pour le moment. Dès
                      qu&apos;un client achète un billet, la transaction apparaît ici en temps réel.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100 text-xs">
                      {orders.slice(0, 5).map((ord) => (
                        <li key={ord.publicToken} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#1B2A4A]">
                              {ord.buyerName} · <span className="font-mono text-teal-700">{ord.publicToken}</span>
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {ord.eventTitle} ({ord.tickets.length} billet{ord.tickets.length > 1 ? "s" : ""})
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-[#1B2A4A]">{formatXof(ord.totalToPayXof)}</p>
                            <Link
                              href={`/commandes/${ord.publicToken}`}
                              className="text-[11px] font-semibold text-teal-700 hover:underline"
                            >
                              Reçu QR
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                      <Activity className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                      Journal d&apos;activité récent
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSection("system")}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Audit complet →
                    </button>
                  </div>
                  <ul className="mt-3 divide-y divide-slate-100 text-xs">
                    {auditLogs.slice(0, 5).map((log) => (
                      <li key={log.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                            {log.action}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-slate-800">
                          {log.target} <span className="font-normal text-slate-500">· {log.actor}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 1B. VOTES & CONCOURS PAYANTS (MOTEUR DE CROISSANCE UEMOA)         */}
          {/* ================================================================= */}
          {section === "votes" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Voix exprimées</p>
                  <p className="mt-1 font-display text-xl font-extrabold text-[#1B2A4A] sm:text-2xl">
                    {kpis.totalVotesCount.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                    {kpis.openVoteCampaignsCount} ouvert(s) / {kpis.voteCampaignsCount} concours
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Volume brut Votes</p>
                  <p className="mt-1 font-display text-lg font-extrabold text-[#1B2A4A] sm:text-2xl">
                    {formatXof(kpis.totalVotesGrossXof)}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 sm:p-4">
                  <p className="text-[11px] font-bold text-indigo-800 uppercase">
                    Commissions 8 % (Votes)
                  </p>
                  <p className="mt-1 font-display text-lg font-extrabold text-indigo-950 sm:text-2xl">
                    {formatXof(kpis.totalVotesCommissionXof)}
                  </p>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-3.5 sm:p-4">
                  <p className="text-[11px] font-bold text-teal-800 uppercase">Votes live (session)</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-teal-950">
                    {voteTransactions.length} tx
                  </p>
                  <Link
                    href="/votes"
                    className="mt-0.5 inline-block text-xs font-bold text-teal-700 hover:underline"
                  >
                    Ouvrir /votes public →
                  </Link>
                </div>
              </div>

              <OrganizerVoteManager
                initialCampaigns={voteCampaigns}
                delegatedOrganizers={organizers.map((o) => ({
                  id: o.id,
                  name: o.name,
                  city: o.city,
                  countryCode: o.countryCode,
                }))}
                isAdmin
              />

              {voteTransactions.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="font-display text-base font-bold text-[#1B2A4A]">
                    Dernières transactions de vote en direct ({voteTransactions.length})
                  </h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                          <th className="py-2 pr-3">Réf.</th>
                          <th className="py-2 pr-3">Concours &amp; Candidat</th>
                          <th className="py-2 pr-3">Supporter</th>
                          <th className="py-2 pr-3 text-center">Voix</th>
                          <th className="py-2 pr-3 text-right">Payé</th>
                          <th className="py-2 text-right">Comm. 8 %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {voteTransactions.slice(0, 20).map((tx) => (
                          <tr key={tx.id}>
                            <td className="py-2.5 pr-3 font-mono font-bold text-teal-700">
                              {tx.receiptToken}
                            </td>
                            <td className="py-2.5 pr-3">
                              <p className="font-bold text-[#1B2A4A]">
                                {tx.candidateName} ({tx.candidateCode})
                              </p>
                              <p className="text-[11px] text-slate-500">{tx.campaignTitle}</p>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600">
                              {tx.voterName} · {tx.voterPhone}
                            </td>
                            <td className="py-2.5 pr-3 text-center font-bold text-[#1B2A4A]">
                              +{tx.votesCount}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-bold text-[#1B2A4A]">
                              {formatXof(tx.totalPaidXof)}
                            </td>
                            <td className="py-2.5 text-right font-bold text-indigo-700">
                              {formatXof(tx.platformCommissionXof)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. COMMANDES & TRANSACTIONS                                       */}
          {/* ================================================================= */}
          {section === "orders" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Commandes récentes</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#1B2A4A]">{orders.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Encaissé (live)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#1B2A4A]">
                    {formatXof(orders.reduce((s, o) => s + o.totalToPayXof, 0))}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <p className="text-[11px] font-bold text-indigo-800 uppercase">Commissions 8 % (live)</p>
                  <p className="mt-1 font-display text-2xl font-bold text-indigo-950">
                    {formatXof(orders.reduce((s, o) => s + o.platformCommissionXof, 0))}
                  </p>
                </div>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h2 className="font-display text-base font-bold text-[#1B2A4A]">
                    Historique des transactions ({filteredOrders.length})
                  </h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Réf. JVR-, client, téléphone..."
                      className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                    />
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-600">
                    Aucune commande ne correspond à votre recherche. Effectuez un achat test depuis
                    le catalogue public pour voir le détail complet ici.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                          <th className="py-2.5 pr-3">Référence</th>
                          <th className="py-2.5 pr-3">Acheteur</th>
                          <th className="py-2.5 pr-3">Événement</th>
                          <th className="py-2.5 pr-3 text-center">Billets</th>
                          <th className="py-2.5 pr-3">Paiement</th>
                          <th className="py-2.5 pr-3 text-right">Total payé</th>
                          <th className="py-2.5 pr-3 text-right">Comm. 8 %</th>
                          <th className="py-2.5 text-right">Reçu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((ord) => (
                          <tr key={ord.publicToken} className="hover:bg-slate-50">
                            <td className="py-3 pr-3 font-mono font-bold text-teal-700">
                              {ord.publicToken}
                            </td>
                            <td className="py-3 pr-3">
                              <p className="font-bold text-[#1B2A4A]">{ord.buyerName}</p>
                              <p className="text-[11px] text-slate-500">{ord.buyerPhone}</p>
                            </td>
                            <td className="py-3 pr-3">
                              <p className="font-semibold text-slate-800">{ord.eventTitle}</p>
                              <p className="text-[11px] text-slate-500">{ord.eventCity}</p>
                            </td>
                            <td className="py-3 pr-3 text-center font-bold text-[#1B2A4A]">
                              {ord.tickets.length}
                            </td>
                            <td className="py-3 pr-3 text-slate-700">
                              {PAYMENT_METHODS[ord.paymentMethod]?.shortName ?? ord.paymentMethod}
                            </td>
                            <td className="py-3 pr-3 text-right font-bold text-[#1B2A4A]">
                              {formatXof(ord.totalToPayXof)}
                            </td>
                            <td className="py-3 pr-3 text-right font-bold text-indigo-700">
                              {formatXof(ord.platformCommissionXof)}
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                href={`/commandes/${ord.publicToken}`}
                                className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                              >
                                Ouvrir
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. CATALOGUE & MODÉRATION                                         */}
          {/* ================================================================= */}
          {section === "catalog" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Rechercher par titre, ville, lieu ou promoteur..."
                      className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                    />
                  </div>
                  <select
                    value={catalogCountry}
                    onChange={(e) => setCatalogCountry(e.target.value)}
                    aria-label="Filtrer par pays"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">Tous les pays UEMOA</option>
                    {UEMOA_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={featuredOnly}
                      onChange={(e) => setFeaturedOnly(e.target.checked)}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    ★ À la une ({kpis.featuredEventsCount})
                  </label>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                      <th className="py-2.5 pr-3">Événement</th>
                      <th className="py-2.5 pr-3">Lieu &amp; GPS</th>
                      <th className="py-2.5 pr-3">Remplissage</th>
                      <th className="py-2.5 pr-3 text-right">Brut / Comm. 8 %</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((evt) => {
                      const sold = evt.tiers.reduce((s, t) => s + t.soldQty, 0);
                      const total = evt.tiers.reduce((s, t) => s + t.totalQty, 0);
                      const gross = evt.tiers.reduce((s, t) => s + t.soldQty * t.priceXof, 0);
                      const comm = Math.round((gross * evt.commissionBps) / 10_000);
                      const fill = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                      const hasGps = evt.latitude !== undefined || Boolean(evt.mapsUrl);

                      return (
                        <tr key={evt.id} className="hover:bg-slate-50">
                          <td className="py-3.5 pr-3">
                            <p className="font-bold text-[#1B2A4A]">{evt.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              <strong>{evt.organizer.name}</strong> · {formatEventDate(evt.startsAt, evt.timezone)} ·{" "}
                              {evt.tiers.length} pass
                            </p>
                          </td>
                          <td className="py-3.5 pr-3">
                            <p className="font-medium text-slate-700">
                              {evt.city} ({evt.countryCode})
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <MapPin className="h-3 w-3 text-teal-600" aria-hidden="true" />
                              <span className="max-w-[160px] truncate">{evt.venueName}</span>
                              {hasGps && (
                                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">
                                  GPS
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-teal-500"
                                  style={{ width: `${fill}%` }}
                                />
                              </div>
                              <span className="font-semibold text-slate-700">
                                {sold}/{total}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-3 text-right">
                            <p className="font-bold text-[#1B2A4A]">{formatXof(gross)}</p>
                            <p className="text-[11px] font-semibold text-indigo-700">
                              {formatXof(comm)} Javeroo
                            </p>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busyId === evt.id}
                                onClick={() => void handleToggleFeatured(evt.id)}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                                  evt.isFeatured
                                    ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {evt.isFeatured ? "★ Une" : "☆ Une"}
                              </button>
                              <Link
                                href={`/evenements/${evt.slug}`}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Fiche
                              </Link>
                              <Link
                                href={`/scan?eventId=${encodeURIComponent(evt.id)}`}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Scan
                              </Link>
                              {confirmDeleteId === evt.id ? (
                                <button
                                  type="button"
                                  disabled={busyId === evt.id}
                                  onClick={() => void handleDeleteEvent(evt.id)}
                                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
                                >
                                  Confirmer ?
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(evt.id)}
                                  aria-label={`Supprimer ${evt.title}`}
                                  className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ================================================================= */}
          {/* 4. PROMOTEURS & CONCIERGERIE (GESTION DÉLÉGUÉE)                   */}
          {/* ================================================================= */}
          {section === "promoters" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                      <Building2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
                      Annuaire des promoteurs partenaires ({filteredOrganizers.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cliquez sur « + Publier pour lui » pour créer un événement directement au nom
                      d&apos;un promoteur.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={promoterSearch}
                      onChange={(e) => setPromoterSearch(e.target.value)}
                      placeholder="Rechercher un promoteur..."
                      className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                        <th className="py-2.5 pr-3">Promoteur</th>
                        <th className="py-2.5 pr-3">Ville / Pays</th>
                        <th className="py-2.5 pr-3">KYC</th>
                        <th className="py-2.5 pr-3 text-right">Év.</th>
                        <th className="py-2.5 pr-3 text-right">Billets</th>
                        <th className="py-2.5 pr-3 text-right">Brut</th>
                        <th className="py-2.5 pr-3 text-right">Comm. 8 %</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrganizers.map((org) => (
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
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => jumpToDelegatedCreate(org.id)}
                                className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                              >
                                + Publier pour lui
                              </button>
                              <Link
                                href={`/promoteurs/${org.slug}`}
                                className="font-semibold text-teal-700 hover:underline"
                              >
                                Profil
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div ref={delegatedFormRef}>
                <OrganizerEventForm
                  delegatedOrganizers={organizers.map((o) => ({
                    id: o.id,
                    name: o.name,
                    city: o.city,
                    countryCode: o.countryCode,
                  }))}
                  selectedOrganizationId={selectedOrgForForm}
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 5. FINANCES, KYC, REVERSEMENTS & GRAND LIVRE GLOBAL               */}
          {/* ================================================================= */}
          {section === "finance" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Total brut plateforme</p>
                  <p className="mt-1 font-display text-xl font-bold text-[#1B2A4A]">
                    {formatXof(kpis.totalGrossSalesXof)}
                  </p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <p className="text-[11px] font-bold text-indigo-800 uppercase">
                    Part Javeroo ({kpis.commissionPercent} %)
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-indigo-950">
                    {formatXof(kpis.totalJaverooCommissionXof)}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-[11px] font-bold text-amber-900 uppercase">À virer sous 48 h</p>
                  <p className="mt-1 font-display text-xl font-bold text-amber-950">
                    {formatXof(kpis.pendingPayoutsAmountXof)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[11px] font-bold text-emerald-900 uppercase">Déjà viré</p>
                  <p className="mt-1 font-display text-xl font-bold text-emerald-950">
                    {formatXof(kpis.completedPayoutsAmountXof)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                {/* Validation KYC */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                    <Shield className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                    Dossiers KYC ({kycSubmissions.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {kycSubmissions.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                        Aucun dossier KYC déposé.
                      </p>
                    ) : (
                      kycSubmissions.map((k) => (
                        <div
                          key={k.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="text-xs">
                            <p className="font-bold text-[#1B2A4A]">
                              {k.organizationName}{" "}
                              <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                {k.documentType} · {k.documentReference}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {k.payoutDestination} · {new Date(k.submittedAt).toLocaleString("fr-FR")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {k.status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === k.id}
                                  onClick={() => void handleKyc(k.id, "APPROVED")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  Approuver
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === k.id}
                                  onClick={() => void handleKyc(k.id, "REJECTED")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
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

                {/* File des reversements */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                    <Wallet className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    Reversements organisateurs ({payouts.length})
                  </h2>
                  <div className="mt-4 space-y-3">
                    {payouts.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                        Aucune demande de reversement.
                      </p>
                    ) : (
                      payouts.map((p) => (
                        <div
                          key={p.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="text-xs">
                            <p className="font-bold text-[#1B2A4A]">
                              {formatXof(p.amountXof)} — {p.organizationName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {p.method} · {p.destination}
                              {p.externalReference ? ` · Réf. ${p.externalReference}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {p.status === "REQUESTED" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === p.id}
                                  onClick={() => void handlePayout(p.id, "COMPLETED")}
                                  className="rounded-lg bg-[#1B2A4A] px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-50"
                                >
                                  Confirmer virement
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === p.id}
                                  onClick={() => void handlePayout(p.id, "REJECTED")}
                                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
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

              {/* Grand livre comptable global */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h2 className="font-display text-base font-bold text-[#1B2A4A]">
                    Grand livre comptable global ({filteredLedger.length} écritures)
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "ALL", label: "Tout" },
                        { id: "TICKET_SALE", label: "Ventes" },
                        { id: "PLATFORM_COMMISSION", label: "Commissions 8 %" },
                        { id: "PAYOUT", label: "Retraits" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setLedgerFilter(f.id)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          ledgerFilter === f.id
                            ? "bg-[#1B2A4A] text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 pr-3">Libellé</th>
                        <th className="py-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedger.map((entry) => (
                        <tr key={entry.id}>
                          <td className="py-2.5 pr-3 text-slate-500">
                            {new Date(entry.createdAt).toLocaleString("fr-FR")}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                              {entry.entryType}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 font-medium text-slate-800">{entry.label}</td>
                          <td
                            className={`py-2.5 text-right font-bold ${
                              entry.amountXof >= 0 ? "text-emerald-700" : "text-slate-700"
                            }`}
                          >
                            {entry.amountXof >= 0 ? "+" : ""}
                            {formatXof(entry.amountXof)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* ================================================================= */}
          {/* 6. ÉQUIPE SUPERADMIN, INFRASTRUCTURE & AUDIT                      */}
          {/* ================================================================= */}
          {section === "system" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Équipe SuperAdmin */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                    <Users className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                    Équipe SuperAdmin active ({superAdmins.length})
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Gérée de façon sécurisée par variables Vercel{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">SUPER_ADMIN_1_*</code> à{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">SUPER_ADMIN_10_*</code>.
                  </p>
                  <ul className="mt-4 divide-y divide-slate-100 text-xs">
                    {superAdmins.map((admin) => {
                      const isSelf =
                        admin.email.toLowerCase() === currentAdmin.email.toLowerCase();
                      return (
                        <li key={admin.id} className="flex items-center justify-between gap-3 py-3">
                          <div>
                            <p className="font-bold text-[#1B2A4A]">
                              {admin.fullName}
                              {isSelf && (
                                <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
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

                {/* Santé & Configuration Plateforme */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                    <Server className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    Santé de l&apos;infrastructure &amp; Règles métier
                  </h2>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="flex items-center gap-2 font-semibold text-slate-700">
                        <Database className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Base de données PostgreSQL
                      </dt>
                      <dd
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          systemStatus.databaseConfigured
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {systemStatus.databaseConfigured
                          ? "Connectée (DATABASE_URL)"
                          : "Mémoire + Cookies signés (à brancher Neon)"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="flex items-center gap-2 font-semibold text-slate-700">
                        <HardDrive className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Stockage affiches
                      </dt>
                      <dd
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          systemStatus.blobStorageConfigured
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {systemStatus.blobStorageConfigured
                          ? "Vercel Blob CDN actif"
                          : "Fallback Base64 (activer Vercel Blob)"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="flex items-center gap-2 font-semibold text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Secrets cryptographiques (QR &amp; Sessions)
                      </dt>
                      <dd
                        className={`rounded-full px-2.5 py-0.5 font-bold ${
                          systemStatus.secretsConfigured
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {systemStatus.secretsConfigured ? "Configurés (Production)" : "Clés dev"}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="font-semibold text-slate-700">Passerelle paiement</dt>
                      <dd className="font-mono font-bold text-[#1B2A4A]">
                        {systemStatus.paymentProvider}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                      <dt className="font-semibold text-slate-700">Règle tarifaire verrouillée</dt>
                      <dd className="font-bold text-teal-800">
                        0 FCFA/mois · 0 % gratuit · {kpis.commissionPercent} % organisateur
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              {/* Journal d'audit filtrable */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
                    <ClipboardList className="h-4 w-4 text-slate-600" aria-hidden="true" />
                    Journal d&apos;audit immuable ({filteredAudit.length})
                  </h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Filtrer par action, acteur, cible..."
                      className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs"
                    />
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-slate-100 text-xs">
                  {filteredAudit.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                    >
                      <div>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                          {log.action}
                        </span>
                        <p className="mt-1 font-semibold text-slate-800">
                          {log.target}{" "}
                          <span className="font-normal text-slate-500">par {log.actor}</span>
                        </p>
                        <p className="text-slate-600">{log.details}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
