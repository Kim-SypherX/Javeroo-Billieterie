"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Shield,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import { formatEventDate, formatXof } from "@/config/uemoa";
import type { EventView } from "@/modules/events/types";
import type {
  AuditLogView,
  KycSubmissionView,
  PayoutRequestView,
} from "@/modules/operations/store";

interface AdminConsoleProps {
  kycSubmissions: KycSubmissionView[];
  payouts: PayoutRequestView[];
  events: EventView[];
  auditLogs: AuditLogView[];
}

export function AdminConsole({
  kycSubmissions,
  payouts,
  events,
  auditLogs,
}: AdminConsoleProps) {
  const router = useRouter();
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
            decision === "REJECTED" ? "Document illisible ou incomplet, merci de renvoyer." : undefined,
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
      {banner && (
        <div
          role="status"
          className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
        >
          {banner}
        </div>
      )}

      {/* 1. Validation KYC */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
          <Shield className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          Validation des dossiers KYC ({kycSubmissions.length})
        </h2>
        <div className="mt-4 space-y-3">
          {kycSubmissions.map((k) => (
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
                    {k.status === "APPROVED" && <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    {k.status === "APPROVED" ? "Approuvé" : "Rejeté"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Reversements Organisateurs */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
          <Wallet className="h-5 w-5 text-teal-600" aria-hidden="true" />
          File des reversements organisateurs ({payouts.length})
        </h2>
        <div className="mt-4 space-y-3">
          {payouts.map((p) => (
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
          ))}
        </div>
      </section>

      {/* 3. Modération Événements & Journal d'Audit */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
            <Star className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Modération « À la une » ({events.length})
          </h2>
          <ul className="mt-4 divide-y divide-slate-100 text-xs">
            {events.map((evt) => (
              <li key={evt.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#1B2A4A]">{evt.title}</p>
                  <p className="text-slate-500">
                    {evt.city} · {formatEventDate(evt.startsAt, evt.timezone)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === evt.id}
                  onClick={() => void handleToggleFeatured(evt.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 font-bold ${
                    evt.isFeatured
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {evt.isFeatured ? "★ À la une" : "Mettre en avant"}
                </button>
              </li>
            ))}
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
    </div>
  );
}

