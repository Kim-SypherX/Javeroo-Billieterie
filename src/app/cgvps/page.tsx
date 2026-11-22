import type { Metadata } from "next";
import Link from "next/link";
import { PRICING_CONFIG } from "@/config/pricing";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Conditions Générales Organisateurs (CGVPS)",
  description: `Mandat d'encaissement, grille de commission (${PRICING_CONFIG.standardCommissionPercent} %) et délais de reversement (${PRICING_CONFIG.payoutSla.mobileMoneyLabel}).`,
};

export default function CgvpsPage() {
  const { legal } = SITE_CONFIG;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
        Version {legal.version} · Dernière mise à jour : {legal.lastUpdated}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
        Conditions Organisateurs (CGVPS)
      </h1>

      <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-xs sm:p-8">
        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            1. Mandat d&apos;encaissement
          </h2>
          <p className="mt-2">
            L&apos;organisateur mandate {legal.companyName} pour encaisser en son nom et pour son
            compte les recettes de billetterie. Les fonds encaissés sont suivis dans un grand livre
            comptable immuable et ne constituent pas le chiffre d&apos;affaires de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            2. Commissions (alignées avec la page Tarifs)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Abonnement mensuel : <strong>0 FCFA / mois</strong>.</li>
            <li>Événements gratuits : <strong>0 % de commission</strong>.</li>
            <li>
              Billets payants (standard) :{" "}
              <strong>{PRICING_CONFIG.standardCommissionPercent} % tout inclus</strong> (prise en
              charge au choix de l&apos;organisateur ou refacturée de façon transparente à
              l&apos;acheteur).
            </li>
            <li>
              Grands comptes (&ge; {PRICING_CONFIG.enterpriseTicketThreshold.toLocaleString("fr-FR")}{" "}
              billets) : <strong>{PRICING_CONFIG.enterpriseCommissionPercent} %</strong> sur accord.
            </li>
          </ul>
          <p className="mt-2">
            Consultez le simulateur détaillé sur{" "}
            <Link href="/tarifs" className="font-semibold text-teal-700 underline">
              la page Tarifs officielle
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            3. Vérification d&apos;identité (KYC) et délais de reversement
          </h2>
          <p className="mt-2">
            Après validation du dossier KYC (pièce d&apos;identité et coordonnées de réception
            vérifiées), les demandes de retrait sur solde disponible sont traitées sous{" "}
            <strong>{PRICING_CONFIG.payoutSla.mobileMoneyLabel}</strong> par Mobile Money et sous{" "}
            <strong>{PRICING_CONFIG.payoutSla.bankTransferLabel}</strong> par virement bancaire.
          </p>
          <p className="mt-2">{PRICING_CONFIG.firstEventPayoutNote}</p>
        </section>
      </div>
    </article>
  );
}

