import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { PricingSimulator } from "@/components/PricingSimulator";
import { PRICING_CONFIG } from "@/config/pricing";
import { PAYMENT_METHODS, UEMOA_COUNTRIES } from "@/config/uemoa";

export const metadata: Metadata = {
  title: "Tarifs & Commissions Billetterie UEMOA",
  description: `Tarification transparente Javeroo : 0 FCFA/mois, 0 % sur les événements gratuits, ${PRICING_CONFIG.standardCommissionPercent} % tout inclus sur billets payants et reversements Mobile Money sous ${PRICING_CONFIG.payoutSla.mobileMoneyLabel}.`,
};

export default function TarifsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center gap-2 text-xs text-slate-600">
        <Link href="/" className="hover:text-[#1B2A4A]">
          Accueil
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-[#1B2A4A]">Tarifs</span>
      </nav>

      <div className="max-w-3xl">
        <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
          Transparence totale · Source de vérité unique
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A] sm:text-4xl">
          Zéro abonnement. Vous ne payez que lorsque vous vendez.
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Les tarifs et délais affichés ici sont strictement identiques dans votre tableau de bord
          organisateur et dans nos{" "}
          <Link href="/cgvps" className="font-semibold text-teal-700 underline">
            Conditions Organisateurs (CGVPS)
          </Link>
          .
        </p>
      </div>

      {/* Cartes tarifaires */}
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Événements gratuits
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-[#1B2A4A]">0&nbsp;%</p>
          <p className="mt-1 text-sm text-slate-600">0&nbsp;FCFA / mois · Gratuit sans limite</p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            {[
              "Page événement complète et partage WhatsApp",
              "Billets nominatifs avec QR code sécurisé",
              "Contrôle porte hors-ligne inclus",
              "Export Excel / CSV des participants",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard"
            className="mt-auto pt-6"
          >
            <span className="flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-[#1B2A4A] hover:bg-slate-50">
              Créer un événement gratuit
            </span>
          </Link>
        </article>

        <article className="relative flex flex-col rounded-3xl border-2 border-teal-600 bg-white p-7 shadow-md">
          <span className="absolute -top-3 right-6 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-bold text-white uppercase">
            Standard UEMOA
          </span>
          <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
            Billets payants
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-[#1B2A4A]">
            {PRICING_CONFIG.standardCommissionPercent}&nbsp;%
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Tout inclus · Déduite des recettes organisateur (0 FCFA ajouté au spectateur)
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            {[
              "Frais Mobile Money et carte bancaire inclus",
              "Codes promo applicables directement sur le web",
              `Reversement Mobile Money sous ${PRICING_CONFIG.payoutSla.mobileMoneyLabel}`,
              "Invitations VIP gratuites & scan multi-portes",
              "Zéro publicité dans le tunnel d'achat",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="mt-auto pt-6">
            <span className="flex w-full items-center justify-center rounded-xl bg-[#1B2A4A] px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-600">
              Démarrer gratuitement
            </span>
          </Link>
        </article>

        <article className="flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
          <p className="text-xs font-bold tracking-wider text-indigo-700 uppercase">
            Grands événements &amp; Festivals
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-[#1B2A4A]">
            {PRICING_CONFIG.enterpriseCommissionPercent}&nbsp;%
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Dès {PRICING_CONFIG.enterpriseTicketThreshold.toLocaleString("fr-FR")} billets vendus
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            {[
              "Commission réduite sur contrat partenaire",
              "Accompagnement dédié le jour de l'événement",
              "Déploiement multi-portes et formation agents",
              `Virement bancaire sous ${PRICING_CONFIG.payoutSla.bankTransferLabel}`,
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a
            href="mailto:support@javeroo.com?subject=Partenariat%20Grand%20Evenement"
            className="mt-auto pt-6"
          >
            <span className="flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-[#1B2A4A] hover:bg-slate-50">
              Contacter l&apos;équipe grands comptes
            </span>
          </a>
        </article>
      </div>

      {/* Simulateur interactif */}
      <div className="mt-12">
        <PricingSimulator />
      </div>

      {/* Couverture exacte des 8 pays UEMOA */}
      <section aria-labelledby="uemoa-coverage-title" className="mt-14">
        <h2 id="uemoa-coverage-title" className="font-display text-2xl font-bold text-[#1B2A4A]">
          Couverture paiements — Zone UEMOA (8 pays · FCFA)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Une seule devise (XOF / FCFA) sur tous nos pays de lancement, sans erreur de devise ni
          frais de change cachés.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {UEMOA_COUNTRIES.map((country) => (
            <div
              key={country.code}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#1B2A4A]">{country.name}</h3>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">
                  {country.currency}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Indicatif {country.dialCode}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {country.paymentMethods.map((m) => (
                  <span
                    key={m}
                    className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                  >
                    {PAYMENT_METHODS[m].shortName}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rappel SLA reversement & anti-fraude */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-100 p-6 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-bold text-[#1B2A4A]">
          <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
          Règles de reversement &amp; protection acheteurs
        </p>
        <p className="mt-2 leading-relaxed">
          Reversements Mobile Money traités sous{" "}
          <strong>{PRICING_CONFIG.payoutSla.mobileMoneyLabel}</strong> après demande sur solde
          disponible (virement bancaire sous{" "}
          <strong>{PRICING_CONFIG.payoutSla.bankTransferLabel}</strong>), sous réserve d&apos;un
          dossier d&apos;identité (KYC) validé. {PRICING_CONFIG.firstEventPayoutNote}
        </p>
      </div>
    </div>
  );
}

