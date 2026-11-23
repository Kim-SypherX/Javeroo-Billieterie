import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  WifiOff,
} from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { VoteCampaignCard } from "@/components/VoteCampaignCard";
import { PRICING_CONFIG } from "@/config/pricing";
import { EVENT_CATEGORIES } from "@/config/site";
import { UEMOA_COUNTRIES } from "@/config/uemoa";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { getPlatformPublicStats, listFeaturedEvents } from "@/modules/events/store";
import { hydrateVotesIntoStore } from "@/modules/votes/cookie-store";
import { getVotesGlobalSummary, listFeaturedVoteCampaigns } from "@/modules/votes/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await hydrateCustomEventsIntoStore();
  await hydrateVotesIntoStore();
  const featured = listFeaturedEvents(4);
  const featuredVotes = listFeaturedVoteCampaigns(3);
  const stats = getPlatformPublicStats();
  const voteStats = getVotesGlobalSummary();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#1B2A4A] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(14,165,164,0.28),transparent_55%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-18 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wider text-teal-300 uppercase backdrop-blur-xs sm:px-3.5 sm:py-1.5 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Zone UEMOA · {UEMOA_COUNTRIES.length} pays · FCFA
            </p>
            <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight sm:mt-5 sm:text-5xl">
              Votes en ligne &amp; Billetterie Mobile Money en 30&nbsp;secondes.
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-lg">
              Soutenez vos candidats (Miss, Awards, Musique, Concours) et achetez vos billets
              directement sur le web sans compte ni publicité. Promoteurs : zéro abonnement,{" "}
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
              className="mt-5 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:mt-8 sm:flex-row sm:items-center sm:gap-2.5 sm:p-2.5"
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

            {/* Catégories rapides sur une ligne horizontale défilable sur mobile */}
            <div className="no-scrollbar -mx-4 mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              <Link
                href="/votes"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 transition hover:bg-teal-300"
              >
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Votes en cours ({voteStats.openCampaignsCount})
              </Link>
              {EVENT_CATEGORIES.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/evenements?categorie=${cat.id}`}
                  className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-400 hover:bg-teal-500/20 hover:text-white"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Indicateurs en rail horizontal sur mobile -> grille 4 cols sur desktop */}
          <div className="no-scrollbar -mx-4 mt-7 flex snap-x snap-mandatory gap-2.5 overflow-x-auto border-t border-white/10 px-4 pt-5 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pt-8">
            {[
              { value: `${voteStats.totalVotes.toLocaleString("fr-FR")} voix`, label: "Votes exprimés en direct" },
              {
                value: `${PRICING_CONFIG.standardCommissionPercent} %`,
                label: "Commission max tout inclus",
              },
              { value: `${stats.eventsCount} événements`, label: "En vente vérifiée UEMOA" },
              {
                value: PRICING_CONFIG.payoutSla.mobileMoneyLabel,
                label: "Reversement Mobile Money",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="w-[46vw] max-w-[190px] shrink-0 snap-start rounded-2xl bg-white/5 px-3.5 py-3 sm:w-auto sm:max-w-none sm:px-4 sm:py-3.5"
              >
                <p className="font-display text-lg font-bold text-teal-300 sm:text-2xl">
                  {item.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-300 sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mise en avant prioritaire : Concours & Votes en cours (carrousel horizontal sur mobile) */}
      {featuredVotes.length > 0 && (
        <section
          aria-labelledby="votes-une-title"
          className="border-b border-slate-200 bg-gradient-to-b from-teal-50/60 to-white py-8 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-teal-700 uppercase sm:text-xs">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  Javeroo Votes · Mobile Money
                </p>
                <h2
                  id="votes-une-title"
                  className="mt-0.5 font-display text-xl font-bold text-[#1B2A4A] sm:mt-1 sm:text-3xl"
                >
                  Concours &amp; Votes en cours
                </h2>
              </div>
              <Link
                href="/votes"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 sm:text-sm"
              >
                Tout voir
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-500 sm:hidden">
              Glissez vers la droite pour voir tous les concours →
            </p>

            <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {featuredVotes.map((campaign) => (
                <div
                  key={campaign.id}
                  className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-auto sm:max-w-none"
                >
                  <VoteCampaignCard campaign={campaign} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4 engagements différenciants (rail horizontal sur mobile) */}
      <section aria-labelledby="engagements-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-teal-700 uppercase sm:text-xs">
              Conçu pour le terrain
            </p>
            <h2 id="engagements-title" className="mt-0.5 font-display text-xl font-bold text-[#1B2A4A] sm:mt-1 sm:text-3xl">
              Sans friction, pensé pour l&apos;Afrique de l&apos;Ouest
            </h2>
          </div>
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 sm:hidden">
            Glissez →
          </span>
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {[
            {
              icon: Smartphone,
              title: "100 % Web · Android & iPhone",
              desc: "Achetez vos billets et votez directement sur le site, sans créer de compte ni installer d'application.",
            },
            {
              icon: ShieldCheck,
              title: "Zéro publicité parasite",
              desc: "Aucune fenêtre publicitaire ne vient interrompre l'acheteur pendant son choix ou son paiement Mobile Money.",
            },
            {
              icon: WifiOff,
              title: "Contrôle porte hors-ligne",
              desc: "Les agents d'accueil scannent les QR codes sécurisés même si la connexion 4G sature autour du stade.",
            },
            {
              icon: QrCode,
              title: "Réception multi-canal",
              desc: "QR code immédiat à l'écran + PDF téléchargeable + récupération facile par téléphone ou e-mail.",
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="w-[74vw] max-w-[270px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:w-auto sm:max-w-none sm:p-5"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 sm:h-10 sm:w-10">
                <feat.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-3 font-display text-sm font-bold text-[#1B2A4A] sm:mt-4 sm:text-base">
                {feat.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:mt-1.5 sm:text-sm">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Événements à la une (carrousel horizontal sur mobile) */}
      <section
        aria-labelledby="featured-events-title"
        className="border-y border-slate-200 bg-white py-8 sm:py-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-teal-700 uppercase sm:text-xs">
                Prochainement près de chez vous
              </p>
              <h2
                id="featured-events-title"
                className="mt-0.5 font-display text-xl font-bold text-[#1B2A4A] sm:mt-1 sm:text-3xl"
              >
                Événements à la une
              </h2>
            </div>
            <Link
              href="/evenements"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 sm:text-sm"
            >
              Tout voir
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-500 sm:hidden">
            Glissez vers la droite pour parcourir les événements →
          </p>

          <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {featured.map((event) => (
              <div
                key={event.id}
                className="w-[82vw] max-w-[330px] shrink-0 snap-start sm:w-auto sm:max-w-none"
              >
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc Organisateurs compact sur mobile */}
      <section aria-labelledby="organizers-cta-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid items-center gap-6 rounded-2xl bg-[#1B2A4A] p-5 text-white shadow-xl sm:rounded-3xl sm:gap-8 sm:p-8 lg:grid-cols-12 lg:p-12">
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

