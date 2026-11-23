"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Tag,
  X,
} from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import {
  formatXof,
  getCountryByCode,
  PAYMENT_METHODS,
  UEMOA_COUNTRIES,
  type PaymentMethodId,
} from "@/config/uemoa";
import { calculateOrderPricing, type PromoRule } from "@/modules/checkout/pricing";
import { getTierRemaining, type EventView } from "@/modules/events/types";

interface CheckoutModalProps {
  event: EventView;
  initialTierId?: string;
  open: boolean;
  onClose: () => void;
}

export function CheckoutModal({ event, initialTierId, open, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const country = getCountryByCode(event.countryCode);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const firstAvailable =
      event.tiers.find((t) => t.id === initialTierId && getTierRemaining(t) > 0) ??
      event.tiers.find((t) => getTierRemaining(t) > 0);
    if (firstAvailable) {
      initial[firstAvailable.id] = 1;
    }
    return initial;
  });

  // Promo code directement utilisable sur le web
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoRule | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Coordonnées invité (zéro compte requis)
  const [buyerName, setBuyerName] = useState("");
  const [dialCode, setDialCode] = useState(country.dialCode);
  const [buyerPhoneLocal, setBuyerPhoneLocal] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");

  // Paiement & hold 10 minutes
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(
    country.paymentMethods[0] ?? "ORANGE_MONEY",
  );
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(PRICING_CONFIG.checkoutHoldMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || step < 2) return;
    const timer = window.setInterval(() => {
      setHoldSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, step]);

  const pricing = useMemo(() => {
    const items = event.tiers
      .map((tier) => ({
        tierId: tier.id,
        tierName: tier.name,
        unitPriceXof: tier.priceXof,
        quantity: quantities[tier.id] ?? 0,
      }))
      .filter((i) => i.quantity > 0);

    return calculateOrderPricing({
      items,
      promo: appliedPromo,
      feeBearer: event.feeBearer,
      commissionBps: event.commissionBps,
    });
  }, [event, quantities, appliedPromo]);

  if (!open) return null;

  function adjustQty(tierId: string, delta: number, maxAllowed: number) {
    setError(null);
    setQuantities((prev) => {
      const current = prev[tierId] ?? 0;
      const next = Math.max(0, Math.min(maxAllowed, current + delta));
      return { ...prev, [tierId]: next };
    });
  }

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setCheckingPromo(true);
    setPromoFeedback(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, code: promoInput.trim() }),
      });
      const data = await res.json();
      if (data.valid && data.promo) {
        setAppliedPromo({
          code: data.promo.code,
          discountType: data.promo.discountType,
          discountValue: data.promo.discountValue,
        });
        setPromoFeedback({ ok: true, msg: data.message });
      } else {
        setAppliedPromo(null);
        setPromoFeedback({ ok: false, msg: data.message ?? "Code invalide." });
      }
    } catch {
      setPromoFeedback({ ok: false, msg: "Impossible de vérifier ce code pour le moment." });
    } finally {
      setCheckingPromo(false);
    }
  }

  function handleContinueToStep2() {
    if (pricing.totalTickets === 0) {
      setError("Sélectionnez au moins un billet pour continuer.");
      return;
    }
    setError(null);
    setHoldSecondsLeft(PRICING_CONFIG.checkoutHoldMinutes * 60);
    setStep(2);
  }

  function handleContinueToStep3(e: React.FormEvent) {
    e.preventDefault();
    if (buyerName.trim().length < 2) {
      setError("Veuillez renseigner votre nom complet.");
      return;
    }
    const cleanPhone = buyerPhoneLocal.replace(/\s+/g, "");
    if (cleanPhone.length < 7) {
      setError("Veuillez saisir un numéro WhatsApp / téléphone valide.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function handleConfirmPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const items = pricing.items.map((i) => ({ tierId: i.tierId, quantity: i.quantity }));
      const fullPhone = `${dialCode} ${buyerPhoneLocal.trim()}`;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          items,
          promoCode: appliedPromo?.code,
          buyerName: buyerName.trim(),
          buyerPhone: fullPhone,
          buyerEmail: buyerEmail.trim(),
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Le paiement n'a pas pu aboutir.");
        setSubmitting(false);
        return;
      }

      router.push(`/commandes/${data.orderToken}`);
    } catch {
      setError("Erreur réseau lors de la confirmation. Veuillez réessayer.");
      setSubmitting(false);
    }
  }

  const mins = String(Math.floor(holdSecondsLeft / 60)).padStart(2, "0");
  const secs = String(holdSecondsLeft % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        {/* Header modale */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-[#1B2A4A] px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-teal-300 uppercase">
              Achat rapide · Sans compte · Zéro publicité
            </p>
            <h2 id="checkout-modal-title" className="mt-0.5 font-display text-lg font-bold">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la fenêtre d'achat"
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Barre d'étapes */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs sm:px-6">
          <ol className="flex items-center gap-4">
            {[
              { n: 1, label: "1. Billets" },
              { n: 2, label: "2. Coordonnées" },
              { n: 3, label: "3. Paiement" },
            ].map((s) => (
              <li
                key={s.n}
                className={`font-semibold ${
                  step === s.n
                    ? "text-teal-700"
                    : step > s.n
                      ? "text-[#1B2A4A]"
                      : "text-slate-400"
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
          {step >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Places réservées {mins}:{secs}
            </span>
          )}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {event.tiers.map((tier) => {
                  const remaining = getTierRemaining(tier);
                  const maxAllowed = Math.min(tier.maxPerOrder, remaining);
                  const qty = quantities[tier.id] ?? 0;

                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                        qty > 0
                          ? "border-teal-500 bg-teal-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1B2A4A]">{tier.name}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{tier.description}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#1B2A4A]">
                            {tier.priceXof === 0 ? "Gratuit" : formatXof(tier.priceXof)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {remaining > 0 ? `· ${remaining} dispo.` : "· Épuisé"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQty(tier.id, -1, maxAllowed)}
                          disabled={qty === 0}
                          aria-label={`Retirer un billet ${tier.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                        >
                          <Minus className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span
                          aria-live="polite"
                          className="w-7 text-center text-sm font-bold text-[#1B2A4A]"
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustQty(tier.id, 1, maxAllowed)}
                          disabled={qty >= maxAllowed || remaining === 0}
                          aria-label={`Ajouter un billet ${tier.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B2A4A] text-white transition hover:bg-teal-600 disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Code promo 100 % fonctionnel sur le web */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label
                  htmlFor="checkout-promo-code"
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase"
                >
                  <Tag className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                  Code promotionnel (utilisable directement sur le web)
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="checkout-promo-code"
                    name="promoCode"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Ex. JAVEROO10 ou BIENVENUE1000"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm uppercase focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={checkingPromo || !promoInput.trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40"
                  >
                    {checkingPromo ? "Vérif..." : "Appliquer"}
                  </button>
                </div>
                {promoFeedback && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      promoFeedback.ok ? "text-teal-700" : "text-red-600"
                    }`}
                  >
                    {promoFeedback.msg}
                  </p>
                )}
              </div>

              {/* Récapitulatif transparent */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total ({pricing.totalTickets} billet(s))</span>
                  <span className="font-medium text-slate-900">
                    {formatXof(pricing.subtotalXof)}
                  </span>
                </div>
                {pricing.discountXof > 0 && (
                  <div className="mt-1.5 flex justify-between text-teal-700">
                    <span>Remise ({appliedPromo?.code})</span>
                    <span className="font-semibold">−{formatXof(pricing.discountXof)}</span>
                  </div>
                )}
                <div className="mt-1.5 flex justify-between text-slate-600">
                  <span>Frais de service acheteur</span>
                  <span className="font-medium text-teal-700">
                    {pricing.buyerFeeXof === 0
                      ? "0 FCFA (aucun frais ajouté)"
                      : formatXof(pricing.buyerFeeXof)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-display text-base font-bold text-[#1B2A4A]">
                  <span>Total à payer</span>
                  <span>
                    {pricing.totalToPayXof === 0 ? "Gratuit" : formatXof(pricing.totalToPayXof)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <form id="checkout-step2-form" onSubmit={handleContinueToStep3} className="space-y-4">
              <p className="text-sm text-slate-600">
                Aucun compte n&apos;est requis. Vos billets QR code seront disponibles immédiatement
                à l&apos;écran et envoyés sur votre WhatsApp / e-mail.
              </p>

              <div>
                <label
                  htmlFor="buyer-full-name"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Nom et prénom du titulaire <span className="text-red-600">*</span>
                </label>
                <input
                  id="buyer-full-name"
                  name="buyerName"
                  type="text"
                  required
                  autoComplete="name"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ex. Aminata Traoré"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="buyer-phone"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Numéro WhatsApp / Mobile Money <span className="text-red-600">*</span>
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    id="buyer-dial-code"
                    name="dialCode"
                    aria-label="Indicatif pays UEMOA"
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium"
                  >
                    {UEMOA_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.dialCode}>
                        {c.code} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                  <input
                    id="buyer-phone"
                    name="buyerPhone"
                    type="tel"
                    required
                    autoComplete="tel-national"
                    value={buyerPhoneLocal}
                    onChange={(e) => setBuyerPhoneLocal(e.target.value)}
                    placeholder="70 00 00 00"
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="buyer-email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Adresse e-mail (recommandée pour recevoir le PDF)
                </label>
                <input
                  id="buyer-email"
                  name="buyerEmail"
                  type="email"
                  autoComplete="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {pricing.totalToPayXof > 0 ? (
                <>
                  <fieldset>
                    <legend className="text-sm font-bold text-[#1B2A4A]">
                      Choisissez votre moyen de paiement ({country.name})
                    </legend>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {country.paymentMethods.map((methodId) => {
                        const info = PAYMENT_METHODS[methodId];
                        const selected = paymentMethod === methodId;
                        return (
                          <label
                            key={methodId}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                              selected
                                ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
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
                            <span className="text-sm font-semibold text-slate-800">
                              {info.shortName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-xs text-teal-900">
                    <p className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      Environnement de démonstration V1 (Sandbox)
                    </p>
                    <p className="mt-1 leading-relaxed">
                      En cliquant sur « Payer {formatXof(pricing.totalToPayXof)} », le paiement{" "}
                      <strong>{PAYMENT_METHODS[paymentMethod].name}</strong> est simulé sans débit
                      réel et vos vrais billets QR code cryptographiques sont émis immédiatement
                      (téléchargement PDF et vérification au portail <code>/scan</code> inclus).
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
                  <p className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    Commande gratuite — aucun paiement requis
                  </p>
                  <p className="mt-1 text-xs">
                    Confirmez pour générer immédiatement vos billets QR code sécurisés.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-bold text-[#1B2A4A]">Récapitulatif final</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {pricing.items.map((i) => (
                    <li key={i.tierId} className="flex justify-between">
                      <span>
                        {i.quantity} × {i.tierName}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatXof(i.lineTotalXof)}
                      </span>
                    </li>
                  ))}
                  {pricing.discountXof > 0 && (
                    <li className="flex justify-between text-teal-700">
                      <span>Remise {appliedPromo?.code}</span>
                      <span>−{formatXof(pricing.discountXof)}</span>
                    </li>
                  )}
                  {pricing.buyerFeeXof > 0 && (
                    <li className="flex justify-between">
                      <span>Frais de service</span>
                      <span>{formatXof(pricing.buyerFeeXof)}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-2.5 font-display text-base font-bold text-[#1B2A4A]">
                  <span>Montant total</span>
                  <span>
                    {pricing.totalToPayXof === 0 ? "Gratuit" : formatXof(pricing.totalToPayXof)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de modale */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          {step === 1 ? (
            <>
              <div>
                <p className="text-xs text-slate-500">{pricing.totalTickets} billet(s)</p>
                <p className="font-display text-base font-bold text-[#1B2A4A]">
                  {pricing.totalToPayXof === 0 ? "Gratuit" : formatXof(pricing.totalToPayXof)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleContinueToStep2}
                disabled={pricing.totalTickets === 0}
                className="rounded-xl bg-[#1B2A4A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-40"
              >
                Continuer
              </button>
            </>
          ) : step === 2 ? (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Retour
              </button>
              <button
                type="submit"
                form="checkout-step2-form"
                className="rounded-xl bg-[#1B2A4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
              >
                Passer au paiement
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {pricing.totalToPayXof === 0
                  ? "Obtenir mes billets gratuits"
                  : `Payer ${formatXof(pricing.totalToPayXof)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

