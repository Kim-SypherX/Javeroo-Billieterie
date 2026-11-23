import type { Metadata } from "next";
import Link from "next/link";
import { Filter, PlusCircle, RotateCcw, Search, Trophy } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* En-tête Votes */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1B2A4A] via-[#1E3A5F] to-[#0F766E] p-7 text-white shadow-md sm:p-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-teal-200 backdrop-blur-xs">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Javeroo Votes · Mobile Money 8 pays UEMOA
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Votes en ligne &amp; Concours officiels
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Soutenez vos candidats (Miss, Awards, Musique, Créateurs, Sport) en quelques secondes
              par Orange Money, Wave, Moov Money ou MTN MoMo — sans compte requis et avec
              classement transparent en temps réel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur-xs">
              <p className="text-[11px] font-semibold text-teal-200 uppercase">Voix exprimées</p>
              <p className="font-display text-xl font-extrabold">
                {summary.totalVotes.toLocaleString("fr-FR")}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-teal-300"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              Lancer un concours de vote
            </Link>
          </div>
        </div>
      </div>

      {/* Filtres combinables */}
      <form
        action="/votes"
        method="GET"
        role="search"
        aria-label="Filtrer les concours de vote"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="vote-q" className="block text-xs font-bold text-slate-700 uppercase">
              Concours ou candidat
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="vote-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Nom du concours, candidat ou code (C01)..."
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vote-pays" className="block text-xs font-bold text-slate-700 uppercase">
              Pays UEMOA
            </label>
            <select
              id="vote-pays"
              name="pays"
              defaultValue={pays}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous les pays</option>
              {UEMOA_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vote-cat" className="block text-xs font-bold text-slate-700 uppercase">
              Catégorie
            </label>
            <select
              id="vote-cat"
              name="categorie"
              defaultValue={categorie}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes catégories</option>
              {VOTE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
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

      {/* Grille des campagnes de vote */}
      {campaigns.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
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
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <VoteCampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}

