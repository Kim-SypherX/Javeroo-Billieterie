"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import {
  formatXof,
  getCountryByCode,
  PAYMENT_METHODS,
  UEMOA_COUNTRIES,
  type PaymentMethodId,
} from "@/config/uemoa";
import type {
  VoteCampaignView,
  VoteCandidateView,
  VoteTransactionView,
} from "@/modules/votes/types";

interface VoteModalProps {
  campaign: VoteCampaignView;
  candidate: VoteCandidateView | null;
  candidatePhoto?: string;
  onClose: () => void;
  onVoteSuccess: (updatedCampaign: VoteCampaignView, tx: VoteTransactionView) => void;
}

export function VoteModal({
  campaign,
  candidate,
  candidatePhoto,
  onClose,
  onVoteSuccess,
}: VoteModalProps) {
  const country = getCountryByCode(campaign.countryCode);
  const [votesCount, setVotesCount] = useState<number>(
    campaign.quickPacks[1] ?? campaign.quickPacks[0] ?? 1,
  );
  const [voterName, setVoterName] = useState("");
  const [dialCode, setDialCode] = useState(country.dialCode);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    country.paymentMethods[0] ?? "ORANGE_MONEY",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    tx: VoteTransactionView;
    newTotalVotes: number;
  } | null>(null);

  useEffect(() => {
    if (!candidate) return;
    setVotesCount(
      campaign.unitVotePriceXof === 0
        ? 1
        : (campaign.quickPacks[1] ?? campaign.quickPacks[0] ?? 5),
    );
    setError(null);
    setReceipt(null);
  }, [candidate, campaign.quickPacks, campaign.unitVotePriceXof]);

  useEffect(() => {
    if (!candidate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [candidate, onClose]);

  if (!candidate) return null;

  const totalToPayXof = votesCount * campaign.unitVotePriceXof;

  function adjustVotes(delta: number) {
    setVotesCount((prev) =>
      Math.max(campaign.minVotesPerTx, Math.min(campaign.maxVotesPerTx, prev + delta)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidate) return;
    const cleanPhone = phoneLocal.replace(/\s+/g, "");
    if (cleanPhone.length < 7) {
      setError("Veuillez saisir un numéro Mobile Money / WhatsApp valide.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/votes/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          candidateId: candidate.id,
          votesCount,
          voterName: voterName.trim() || undefined,
          voterPhone: `${dialCode} ${phoneLocal.trim()}`,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Le vote n'a pas pu être enregistré.");
        setSubmitting(false);
        return;
      }

      setReceipt({
        tx: data.transaction as VoteTransactionView,
        newTotalVotes: (data.candidate as VoteCandidateView).votesCount,
      });
      onVoteSuccess(data.campaign as VoteCampaignView, data.transaction as VoteTransactionView);
    } catch {
      setError("Erreur réseau lors de la confirmation. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleShareWhatsApp() {
    if (!candidate || !receipt) return;
    const url = `${window.location.origin}/votes/${campaign.slug}?candidat=${encodeURIComponent(candidate.code)}`;
    const text = `Je viens de voter (${receipt.tx.votesCount} voix) pour ${candidate.name} (Code ${candidate.code}) dans "${campaign.title}" ! Soutiens aussi ton favori ici : ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const initials = candidate.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vote-modal-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header candidat */}
        <div className="flex items-center justify-between gap-3 bg-[#1B2A4A] px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {candidatePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidatePhoto}
                alt={candidate.name}
                className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-teal-400"
              />
            ) : (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-base font-bold text-white ring-2 ring-white/25"
                style={{ backgroundColor: candidate.accentColor }}
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-wider text-teal-300 uppercase">
                Code {candidate.code} · Sans compte · Instantané
              </p>
              <h2 id="vote-modal-title" className="truncate font-display text-lg font-bold">
                Voter pour {candidate.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre de vote"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {receipt ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                  Vote confirmé · Réf. {receipt.tx.receiptToken}
                </p>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#1B2A4A]">
                  +{receipt.tx.votesCount} voix ajoutée{receipt.tx.votesCount > 1 ? "s" : ""} !
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Merci ! <strong>{candidate.name}</strong> ({candidate.code}) compte désormais{" "}
                  <strong className="text-teal-700">
                    {receipt.newTotalVotes.toLocaleString("fr-FR")} voix
                  </strong>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Candidat soutenu</span>
                  <span className="font-bold text-[#1B2A4A]">
                    {candidate.name} ({candidate.code})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Nombre de voix</span>
                  <span className="font-bold text-[#1B2A4A]">{receipt.tx.votesCount} voix</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Montant payé</span>
                  <span className="font-bold text-teal-700">
                    {receipt.tx.totalPaidXof === 0 ? "Gratuit" : formatXof(receipt.tx.totalPaidXof)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Moyen de paiement</span>
                  <span className="font-semibold text-slate-700">
                    {PAYMENT_METHODS[receipt.tx.paymentMethod].shortName}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  Partager mon soutien (WhatsApp)
                </button>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-xs font-bold text-[#1B2A4A] hover:bg-slate-50"
                >
                  Voter encore
                </button>
              </div>
            </div>
          ) : (
            <form id="cast-vote-form" onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
                >
                  {error}
                </div>
              )}

              {/* 1. Packs de voix */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    1. Choisissez votre nombre de voix
                  </span>
                  <span className="text-xs font-semibold text-teal-700">
                    {campaign.unitVotePriceXof === 0
                      ? "Vote gratuit"
                      : `${formatXof(campaign.unitVotePriceXof)} / voix`}
                  </span>
                </div>

                {campaign.unitVotePriceXof > 0 && (
                  <>
                    <div className="mt-2.5 grid grid-cols-3 gap-2">
                      {campaign.quickPacks.map((pack) => {
                        const active = votesCount === pack;
                        return (
                          <button
                            key={pack}
                            type="button"
                            onClick={() => setVotesCount(pack)}
                            className={`rounded-xl border p-2.5 text-center transition ${
                              active
                                ? "border-teal-600 bg-teal-50 ring-1 ring-teal-600"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="block font-display text-sm font-extrabold text-[#1B2A4A]">
                              {pack} voix
                            </span>
                            <span className="block text-[11px] font-semibold text-teal-700">
                              {formatXof(pack * campaign.unitVotePriceXof)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2">
                      <span className="text-xs font-semibold text-slate-700">
                        Quantité personnalisée
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustVotes(-1)}
                          aria-label="Retirer 1 voix"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        >
                          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <input
                          type="number"
                          aria-label="Nombre de voix"
                          min={campaign.minVotesPerTx}
                          max={campaign.maxVotesPerTx}
                          value={votesCount}
                          onChange={(e) =>
                            setVotesCount(
                              Math.max(
                                campaign.minVotesPerTx,
                                Math.min(campaign.maxVotesPerTx, Number(e.target.value) || 1),
                              ),
                            )
                          }
                          className="w-16 rounded-lg border border-slate-300 bg-white py-1 text-center text-sm font-bold text-[#1B2A4A]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustVotes(1)}
                          aria-label="Ajouter 1 voix"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B2A4A] text-white hover:bg-teal-600"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 2. Moyen de paiement Mobile Money */}
              {totalToPayXof > 0 && (
                <div>
                  <span className="block text-xs font-bold text-slate-700 uppercase">
                    2. Moyen de paiement ({country.name})
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {country.paymentMethods.map((methodId) => {
                      const info = PAYMENT_METHODS[methodId];
                      const selected = paymentMethod === methodId;
                      return (
                        <label
                          key={methodId}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                            selected
                              ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="votePaymentMethod"
                            value={methodId}
                            checked={selected}
                            onChange={() => setPaymentMethod(methodId)}
                            className="h-4 w-4 accent-teal-600"
                          />
                          {info.kind === "mobile_money" ? (
                            <Smartphone className="h-4 w-4 text-teal-700" aria-hidden="true" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-[#1B2A4A]" aria-hidden="true" />
                          )}
                          <span className="text-xs font-bold text-slate-800">{info.shortName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Numéro Mobile Money / WhatsApp */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="voter-phone" className="block text-xs font-bold text-slate-700 uppercase">
                    Numéro Mobile Money / WhatsApp *
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <select
                      aria-label="Indicatif pays"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-semibold"
                    >
                      {UEMOA_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.dialCode}>
                          {c.code} {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      id="voter-phone"
                      type="tel"
                      required
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      placeholder="70 00 00 00"
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="voter-name" className="block text-xs font-bold text-slate-700 uppercase">
                    Votre prénom (optionnel)
                  </label>
                  <input
                    id="voter-name"
                    type="text"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="Ex. Issa K."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Transparence */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950">
                <p className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  Zéro frais ajouté · Comptabilisation immédiate (Sandbox V1)
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Total exact : <strong>{totalToPayXof === 0 ? "Gratuit" : formatXof(totalToPayXof)}</strong>{" "}
                  ({votesCount} voix pour {candidate.name}). En mode démonstration V1, aucun débit
                  réel n&apos;est effectué et le classement se met à jour en direct.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Pied de modale */}
        {!receipt && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] text-slate-500">
                {votesCount} voix · 0 FCFA de frais ajoutés
              </p>
              <p className="font-display text-base font-extrabold text-[#1B2A4A]">
                {totalToPayXof === 0 ? "Gratuit" : formatXof(totalToPayXof)}
              </p>
            </div>
            <button
              type="submit"
              form="cast-vote-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {totalToPayXof === 0
                ? "Valider mon vote"
                : `Voter (${formatXof(totalToPayXof)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

