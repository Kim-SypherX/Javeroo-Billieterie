import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Protection des données personnelles et respect de la vie privée sur ${SITE_CONFIG.fullName}.`,
};

export default function ConfidentialitePage() {
  const { legal, contact } = SITE_CONFIG;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
        Version {legal.version} · Dernière mise à jour : {legal.lastUpdated}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
        Politique de confidentialité
      </h1>

      <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-xs sm:p-8">
        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            1. Données collectées et finalités
          </h2>
          <p className="mt-2">
            Nous collectons uniquement les données strictement nécessaires à la délivrance des
            billets (nom complet, numéro WhatsApp / téléphone, e-mail optionnel) et, pour les
            organisateurs, à la vérification d&apos;identité (KYC) et aux reversements financiers.
            Vos données ne sont jamais revendues à des tiers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            2. Cookies &amp; absence de publicité tierce
          </h2>
          <p className="mt-2">
            {SITE_CONFIG.fullName} n&apos;affiche aucune publicité tierce et ne dépose aucun cookie
            publicitaire. Seuls des cookies techniques strictement nécessaires au fonctionnement de
            la session et du panier sont utilisés.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            3. Exercice de vos droits
          </h2>
          <p className="mt-2">
            Conformément aux législations de protection des données en vigueur en zone UEMOA (CIL,
            ARTCI, CDP, APDP), vous pouvez demander l&apos;accès, la rectification ou la suppression
            de vos données en écrivant à{" "}
            <a href={`mailto:${contact.privacyEmail}`} className="font-semibold text-teal-700 underline">
              {contact.privacyEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}

