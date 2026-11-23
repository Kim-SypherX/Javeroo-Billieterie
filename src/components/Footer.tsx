import Link from "next/link";
import { Ticket } from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { SITE_CONFIG } from "@/config/site";
import { UEMOA_COUNTRIES } from "@/config/uemoa";

export function Footer() {
  return (
    <footer className="no-print border-t border-slate-200 bg-[#1B2A4A] pb-18 text-slate-200 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Ticket className="h-5 w-5 text-[#5EEAD4]" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-bold">{SITE_CONFIG.fullName}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Billetterie événementielle Web-First &amp; Mobile Money pour les {UEMOA_COUNTRIES.length}{" "}
              pays de la zone UEMOA. Sans abonnement, sans publicité, reversements sous{" "}
              {PRICING_CONFIG.payoutSla.mobileMoneyLabel}.
            </p>
            <nav aria-label="Réseaux sociaux" className="mt-4 flex flex-wrap gap-2">
              {SITE_CONFIG.socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-teal-500 hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-xs font-bold tracking-wider text-teal-300 uppercase">Spectateurs</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/evenements" className="hover:text-white">
                  Explorer les événements
                </Link>
              </li>
              <li>
                <Link href="/evenements?prix=free" className="hover:text-white">
                  Sorties gratuites
                </Link>
              </li>
              <li>
                <Link href="/mes-billets" className="hover:text-white">
                  Retrouver mes billets
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold tracking-wider text-teal-300 uppercase">
              Organisateurs
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Espace Organisateur
                </Link>
              </li>
              <li>
                <Link href="/tarifs" className="hover:text-white">
                  Tarifs &amp; Simulateur ({PRICING_CONFIG.standardCommissionPercent} % tout inclus)
                </Link>
              </li>
              <li>
                <Link href="/scan" className="hover:text-white">
                  Outil de contrôle porte (QR)
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h2 className="text-xs font-bold tracking-wider text-teal-300 uppercase">
              Zone UEMOA &amp; Contact
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {UEMOA_COUNTRIES.map((c) => c.name).join(" · ")}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>
                <a href={`mailto:${SITE_CONFIG.contact.supportEmail}`} className="hover:text-white">
                  {SITE_CONFIG.contact.supportEmail}
                </a>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp : {SITE_CONFIG.contact.whatsappDisplay}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {SITE_CONFIG.legal.companyName} — Tous droits réservés.
          </p>
          <nav aria-label="Liens légaux" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/mentions-legales" className="hover:text-white">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-white">
              CGU
            </Link>
            <Link href="/cgvps" className="hover:text-white">
              CGVPS Organisateurs
            </Link>
            <Link href="/confidentialite" className="hover:text-white">
              Confidentialité
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

