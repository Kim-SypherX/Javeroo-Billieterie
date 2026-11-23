import type { Metadata } from "next";
import Link from "next/link";
import { Filter, PlusCircle, RotateCcw, Search, Trophy } from "lucide-react";
import { MobileCarousel } from "@/components/MobileCarousel";
import { VoteCampaignCard } from "@/components/VoteCampaignCard";
import { UEMOA_COUNTRIES } from "@/config/uemoa";
import { hydrateVotesIntoStore } from "@/modules/votes/cookie-store";
import { getVotesGlobalSummary, searchVoteCampaigns } from "@/modules/votes/store";
import { VOTE_CATEGORIES } from "@/modules/votes/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votes en ligne & Concours UEMOA — Mobile Money",
  description:
    "Soutenez vos candidats favoris (Miss, Awards, Musique, Créateurs, Sport) par Orange Money, Wave, Moov Money et MTN MoMo sans compte requis.",
};

interface VotesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const val = params[key];
  return typeof val === "string" ? val : "";
}

export default async function VotesCatalogPage({ searchParams }: VotesPageProps) {
  await hydrateVotesIntoStore();
  const raw = await searchParams;
  const pays = getParam(raw, "pays");
  const categorie = getParam(raw, "categorie");
  const q = getParam(raw, "q");

  const campaigns = searchVoteCampaigns({
    pays: pays || undefined,
    categorie: categorie || undefined,
    q: q || undefined,
  });
  const summary = getVotesGlobalSummary();
  const hasActiveFilters = Boolean(pays || categorie || q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      {/* En-tête Votes compact sur mobile */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1B2A4A] via-[#1E3A5F] to-[#0F766E] p-5 text-white shadow-md sm:rounded-3xl sm:p-10">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-teal-200 backdrop-blur-xs sm:text-xs">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Javeroo Votes · Mobile Money 8 pays UEMOA
            </p>
            <h1 className="mt-2.5 font-display text-2xl font-extrabold tracking-tight sm:mt-3 sm:text-4xl">
              Votes en ligne &amp; Concours officiels
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-200 sm:mt-2 sm:text-sm">
              Soutenez vos candidats par Orange Money, Wave, Moov Money ou MTN MoMo — sans compte,
              classement temps réel.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-center backdrop-blur-xs sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold text-teal-200 uppercase sm:text-[11px]">
                Voix
              </p>
              <p className="font-display text-base font-extrabold sm:text-xl">
                {summary.totalVotes.toLocaleString("fr-FR")}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-teal-300 sm:flex-none sm:px-5 sm:py-3 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Lancer un vote
            </Link>
          </div>
        </div>
      </div>

      {/* Puces catégories horizontales 1-tap sur mobile */}
      <div className="no-scrollbar -mx-4 mt-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Link
          href={pays ? `/votes?pays=${pays}` : "/votes"}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            !categorie
              ? "bg-[#1B2A4A] text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Toutes catégories
        </Link>
        {VOTE_CATEGORIES.map((c) => {
          const active = categorie === c.id;
          const href = pays ? `/votes?categorie=${c.id}&pays=${pays}` : `/votes?categorie=${c.id}`;
          return (
            <Link
              key={c.id}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-teal-600 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {/* Barre de recherche compacte */}
      <form
        action="/votes"
        method="GET"
        role="search"
        aria-label="Filtrer les concours de vote"
        className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:mt-4 sm:p-4"
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="vote-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Rechercher un concours, candidat ou code (C01)..."
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-2">
            <select
              id="vote-pays"
              name="pays"
              aria-label="Pays UEMOA"
              defaultValue={pays}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold sm:text-sm"
            >
              <option value="">Tous pays</option>
              {UEMOA_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              id="vote-cat"
              name="categorie"
              aria-label="Catégorie"
              defaultValue={categorie}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold sm:text-sm"
            >
              <option value="">Catégorie</option>
              {VOTE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white hover:bg-teal-600 sm:text-sm"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              Filtrer
            </button>
            {hasActiveFilters && (
              <Link
                href="/votes"
                aria-label="Réinitialiser les filtres"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* Grille des campagnes : rail horizontal sur mobile -> grille sur desktop */}
      {campaigns.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold text-[#1B2A4A]">
            Aucun concours trouvé pour ces critères
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Essayez d&apos;élargir votre recherche ou lancez votre propre campagne de vote.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/votes"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Voir tous les concours
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Créer un concours
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 sm:mt-8">
          <MobileCarousel
            ariaLabel="Catalogue des concours de vote"
            gridClassName="sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          >
            {campaigns.map((campaign) => (
              <VoteCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </MobileCarousel>
        </div>
      )}
    </div>
  );
}

