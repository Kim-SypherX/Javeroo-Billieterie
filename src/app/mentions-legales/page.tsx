import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales officielles de ${SITE_CONFIG.fullName}.`,
};

export default function MentionsLegalesPage() {
  const { legal, contact } = SITE_CONFIG;
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
        Conformité &amp; Identification · Version {legal.version} ({legal.lastUpdated})
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">Mentions légales</h1>

      <div className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-xs sm:p-8">
        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">1. Éditeur du site</h2>
          <ul className="mt-2 space-y-1">
            <li>
              <strong>Dénomination :</strong> {legal.companyName}
            </li>
            <li>
              <strong>Forme juridique :</strong> {legal.legalForm}
            </li>
            <li>
              <strong>Siège social :</strong> {legal.address}
            </li>
            <li>
              <strong>RCCM :</strong> {legal.rccm}
            </li>
            <li>
              <strong>IFU / Identifiant fiscal :</strong> {legal.ifu}
            </li>
            <li>
              <strong>Directeur de publication :</strong> {legal.publicationDirector}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">2. Hébergement</h2>
          <p className="mt-2">{legal.hostingProvider}</p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">3. Contacts officiels</h2>
          <ul className="mt-2 space-y-1">
            <li>
              <strong>Support général :</strong>{" "}
              <a href={`mailto:${contact.supportEmail}`} className="text-teal-700 underline">
                {contact.supportEmail}
              </a>
            </li>
            <li>
              <strong>Protection des données :</strong>{" "}
              <a href={`mailto:${contact.privacyEmail}`} className="text-teal-700 underline">
                {contact.privacyEmail}
              </a>
            </li>
            <li>
              <strong>WhatsApp support :</strong> {contact.whatsappDisplay}
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}

