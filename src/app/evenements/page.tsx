import type { Metadata } from "next";
import Link from "next/link";
import { Filter, RotateCcw, Search } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { EVENT_CATEGORIES } from "@/config/site";
import { UEMOA_COUNTRIES } from "@/config/uemoa";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { searchEvents } from "@/modules/events/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Événements & Concerts en Afrique de l'Ouest",
  description:
    "Explorez et filtrez tous les concerts, festivals, spectacles et conférences en zone UEMOA par pays, ville, date, catégorie et budget.",
};

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const val = params[key];
  return typeof val === "string" ? val : "";
}

export default async function EvenementsPage({ searchParams }: CatalogPageProps) {
  await hydrateCustomEventsIntoStore();
  const raw = await searchParams;
  const pays = getParam(raw, "pays");
  const ville = getParam(raw, "ville");
  const categorie = getParam(raw, "categorie");
  const periode = (getParam(raw, "periode") || "all") as "all" | "today" | "weekend" | "month";
  const prix = (getParam(raw, "prix") || "all") as "all" | "free" | "paid";
  const q = getParam(raw, "q");
  const tri = (getParam(raw, "tri") || "date") as "date" | "price_asc" | "popular";
  const page = Number(getParam(raw, "page") || "1") || 1;

  const catalog = searchEvents({
    pays: pays || undefined,
    ville: ville || undefined,
    categorie: categorie || undefined,
    periode,
    prix,
    q: q || undefined,
    tri,
    page,
    pageSize: 6,
  });

  const hasActiveFilters = Boolean(
    pays || ville || categorie || periode !== "all" || prix !== "all" || q,
  );

  function buildPageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (pays) sp.set("pays", pays);
    if (ville) sp.set("ville", ville);
    if (categorie) sp.set("categorie", categorie);
    if (periode !== "all") sp.set("periode", periode);
    if (prix !== "all") sp.set("prix", prix);
    if (q) sp.set("q", q);
    if (tri !== "date") sp.set("tri", tri);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/evenements?${qs}` : "/evenements";
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
            Catalogue vérifié UEMOA
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
            Tous les événements
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Filtrez par pays, ville, date, catégorie ou budget — sans publicité et sans compte
            requis.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          {catalog.total} événement{catalog.total > 1 ? "s" : ""} trouvé
          {catalog.total > 1 ? "s" : ""}
        </p>
      </div>

      {/* Barre de filtres combinables */}
      <form
        action="/evenements"
        method="GET"
        role="search"
        aria-label="Filtrer les événements"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label htmlFor="filter-q" className="block text-xs font-bold text-slate-700 uppercase">
              Recherche
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Titre, lieu, artiste, promoteur..."
                className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="filter-pays"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Pays (UEMOA)
            </label>
            <select
              id="filter-pays"
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
            <label
              htmlFor="filter-ville"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Ville
            </label>
            <select
              id="filter-ville"
              name="ville"
              defaultValue={ville}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes les villes</option>
              {catalog.availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-categorie"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Catégorie
            </label>
            <select
              id="filter-categorie"
              name="categorie"
              defaultValue={categorie}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-prix"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Budget
            </label>
            <select
              id="filter-prix"
              name="prix"
              defaultValue={prix}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tous les tarifs</option>
              <option value="free">Gratuit uniquement</option>
              <option value="paid">Payant uniquement</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-periode" className="text-xs font-semibold text-slate-600">
                Période :
              </label>
              <select
                id="filter-periode"
                name="periode"
                defaultValue={periode}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="all">Toutes les dates</option>
                <option value="weekend">Prochains jours</option>
                <option value="month">Ce mois-ci</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="filter-tri" className="text-xs font-semibold text-slate-600">
                Trier par :
              </label>
              <select
                id="filter-tri"
                name="tri"
                defaultValue={tri}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="date">Date la plus proche</option>
                <option value="popular">Popularité</option>
                <option value="price_asc">Prix croissant</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Link
                href="/evenements"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Réinitialiser
              </Link>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-600"
            >
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              Appliquer les filtres
            </button>
          </div>
        </div>
      </form>

      {/* Grille des résultats */}
      {catalog.items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="font-display text-xl font-bold text-[#1B2A4A]">
            Aucun événement ne correspond à ces critères
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Essayez d&apos;élargir votre recherche ou de réinitialiser les filtres actifs.
          </p>
          <Link
            href="/evenements"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Afficher tous les événements
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination propre */}
      {catalog.totalPages > 1 && (
        <nav
          aria-label="Pagination du catalogue"
          className="mt-10 flex items-center justify-center gap-2"
        >
          {catalog.page > 1 && (
            <Link
              href={buildPageHref(catalog.page - 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Précédent
            </Link>
          )}
          {Array.from({ length: catalog.totalPages }, (_, i) => i + 1).map((num) => (
            <Link
              key={num}
              href={buildPageHref(num)}
              aria-current={num === catalog.page ? "page" : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                num === catalog.page
                  ? "bg-[#1B2A4A] text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {num}
            </Link>
          ))}
          {catalog.page < catalog.totalPages && (
            <Link
              href={buildPageHref(catalog.page + 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Suivant
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

