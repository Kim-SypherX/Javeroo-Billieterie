import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { PRICING_CONFIG } from "@/config/pricing";
import { EVENT_CATEGORIES } from "@/config/site";
import { UEMOA_COUNTRIES } from "@/config/uemoa";
import { getPlatformPublicStats, listFeaturedEvents } from "@/modules/events/store";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const featured = listFeaturedEvents(4);
  const stats = getPlatformPublicStats();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1B2A4A] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,164,0.28),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wider text-teal-300 uppercase backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Zone UEMOA · {UEMOA_COUNTRIES.length} pays · Devise unique FCFA
            </p>
            <h1 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Vos billets d&apos;événements en 30&nbsp;secondes par Mobile Money.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
              Achetez directement sur le web sans installer d&apos;application et sans publicité.
              Organisateurs : zéro abonnement,{" "}
              <strong className="text-teal-300">
                {PRICING_CONFIG.standardCommissionPercent}&nbsp;% tout inclus
              </strong>{" "}
              et reversements sous {PRICING_CONFIG.payoutSla.mobileMoneyLabel}.
            </p>

            {/* Barre de recherche rapide vers le catalogue filtré */}
            <form
              action="/evenements"
              method="GET"
              role="search"
              aria-label="Rechercher un événement"
              className="mt-8 flex flex-col gap-2.5 rounded-2xl bg-white p-2.5 shadow-xl sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <label htmlFor="home-search-q" className="sr-only">
                  Rechercher un concert, festival, ville ou artiste
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="home-search-q"
                  name="q"
                  type="search"
                  placeholder="Concert, humour, conférence, ville..."
                  className="w-full rounded-xl border-0 bg-slate-50 py-3 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white"
                />
              </div>

              <div className="sm:w-48">
                <label htmlFor="home-search-country" className="sr-only">
                  Choisir un pays UEMOA
                </label>
                <select
                  id="home-search-country"
                  name="pays"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800"
                >
                  <option value="">Tous les pays UEMOA</option>
                  {UEMOA_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                Rechercher
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            {/* Catégories rapides */}
            <div className="mt-5 flex flex-wrap gap-2">
              {EVENT_CATEGORIES.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/evenements?categorie=${cat.id}`}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-teal-400 hover:bg-teal-500/20 hover:text-white"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Indicateurs rendus côté serveur (jamais 0+) */}
          <div className="mt-12 grid grid-cols-2 gap-3 border-t border-white/10 pt-8 sm:grid-cols-4">
            {[
              { value: `${stats.countriesCount} pays`, label: "Zone UEMOA · FCFA" },
              {
                value: `${PRICING_CONFIG.standardCommissionPercent} %`,
                label: "Commission max tout inclus",
              },
              { value: `${stats.eventsCount} événements`, label: "En vente vérifiée" },
              {
                value: PRICING_CONFIG.payoutSla.mobileMoneyLabel,
                label: "Reversement Mobile Money",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/5 px-4 py-3.5">
                <p className="font-display text-xl font-bold text-teal-300 sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 engagements différenciants */}
      <section aria-labelledby="engagements-title" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
            Conçu pour le terrain
          </p>
          <h2 id="engagements-title" className="mt-1 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl">
            Une billetterie sans friction, pensée pour l&apos;Afrique de l&apos;Ouest
          </h2>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Smartphone,
              title: "100 % Web · Android & iPhone",
              desc: "Achetez vos billets et appliquez vos codes promo directement sur le site, sans créer de compte ni installer d'application.",
            },
            {
              icon: ShieldCheck,
              title: "Zéro publicité parasite",
              desc: "Aucune fenêtre publicitaire ne vient interrompre l'acheteur pendant son choix de place ou son paiement Mobile Money.",
            },
            {
              icon: WifiOff,
              title: "Contrôle porte hors-ligne",
              desc: "Les agents d'accueil scannent les QR codes sécurisés même si la connexion 4G sature autour du stade ou de la salle.",
            },
            {
              icon: QrCode,
              title: "Réception multi-canal",
              desc: "QR code immédiat à l'écran + PDF téléchargeable + récupération facile par téléphone ou e-mail à tout moment.",
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <feat.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-[#1B2A4A]">{feat.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Événements à la une */}
      <section
        aria-labelledby="featured-events-title"
        className="border-y border-slate-200 bg-white py-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
                Prochainement près de chez vous
              </p>
              <h2
                id="featured-events-title"
                className="mt-1 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl"
              >
                Événements à la une
              </h2>
            </div>
            <Link
              href="/evenements"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-800"
            >
              Voir tout le catalogue avec filtres
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Bloc Organisateurs */}
      <section aria-labelledby="organizers-cta-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 rounded-3xl bg-[#1B2A4A] p-8 text-white shadow-xl lg:grid-cols-12 lg:p-12">
          <div className="lg:col-span-7">
            <p className="text-xs font-bold tracking-wider text-teal-300 uppercase">
              Organisateurs &amp; Promoteurs
            </p>
            <h2 id="organizers-cta-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Mettez votre événement en vente en 10&nbsp;minutes, sans abonnement.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Encaissez par Orange Money, Wave, Moov Money, MTN MoMo, Mixx/T-Money et carte bancaire.
              Vos spectateurs paient exactement le prix affiché : la commission de{" "}
              {PRICING_CONFIG.standardCommissionPercent}&nbsp;% est prélevée directement sur vos
              ventes payantes (zéro frais sur les billets gratuits).
            </p>
            <ul className="mt-5 grid gap-2.5 text-sm text-slate-200 sm:grid-cols-2">
              {[
                "0 FCFA / mois d'abonnement fixe",
                `Reversements Mobile Money sous ${PRICING_CONFIG.payoutSla.mobileMoneyLabel}`,
                "Codes promo & invitations VIP inclus",
                "Outil de scan porte multi-agents inclus",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:flex-col">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-4 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-teal-400"
            >
              Ouvrir l&apos;Espace Organisateur
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/tarifs"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Simuler mes recettes ({PRICING_CONFIG.standardCommissionPercent} %)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

