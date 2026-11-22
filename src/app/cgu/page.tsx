import type { Metadata } from "next";
import { PRICING_CONFIG } from "@/config/pricing";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation (CGU)",
  description: `Conditions d'achat, d'utilisation des billets et politique d'annulation de ${SITE_CONFIG.fullName}.`,
};

export default function CguPage() {
  const { legal, contact } = SITE_CONFIG;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
        Version {legal.version} · Dernière mise à jour : {legal.lastUpdated}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
        Conditions Générales d&apos;Utilisation (CGU)
      </h1>

      <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-xs sm:p-8">
        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">1. Objet</h2>
          <p className="mt-2">
            {SITE_CONFIG.fullName} est une plateforme d&apos;intermédiation permettant aux
            organisateurs d&apos;événements en zone UEMOA de diffuser et vendre leurs billets, et
            aux spectateurs de les acquérir par Mobile Money ou carte bancaire sans compte
            obligatoire.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            2. Achat, blocage temporaire et délivrance
          </h2>
          <p className="mt-2">
            Lors de la commande, les billets sélectionnés sont réservés pendant{" "}
            <strong>{PRICING_CONFIG.checkoutHoldMinutes} minutes</strong> afin d&apos;éviter toute
            survente. Dès confirmation du paiement, les billets munis d&apos;un QR code unique signé
            sont immédiatement accessibles à l&apos;écran et transmis par les canaux indiqués.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            3. Annulation et report d&apos;événement
          </h2>
          <p className="mt-2">
            En cas d&apos;annulation officielle d&apos;un événement par son organisateur, le
            remboursement des billets est effectué sous{" "}
            <strong>{PRICING_CONFIG.refundPolicy.cancellationRefundBusinessDays} jours ouvrés</strong>{" "}
            via le moyen de paiement d&apos;origine. En cas de report, les billets restent valables
            pour la nouvelle date et les acheteurs disposent de{" "}
            <strong>{PRICING_CONFIG.refundPolicy.postponementRequestDays} jours</strong> pour
            demander un remboursement via{" "}
            <a href={`mailto:${contact.supportEmail}`} className="text-teal-700 underline">
              {contact.supportEmail}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            4. Contrôle d&apos;accès et lutte anti-fraude
          </h2>
          <p className="mt-2">
            Chaque QR code est strictement à usage unique. Toute duplication ou partage de capture
            d&apos;écran entraîne le refus automatique à partir du deuxième passage au contrôle
            d&apos;entrée.
          </p>
        </section>
      </div>
    </article>
  );
}

