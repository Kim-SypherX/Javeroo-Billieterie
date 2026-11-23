"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  Crown,
  EyeOff,
  Flame,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { formatEventDate, formatXof, getCountryByCode } from "@/config/uemoa";
import { readCachedEventPoster } from "@/modules/media/client-poster";
import {
  getCampaignTotalVotes,
  getRankedCandidates,
  VOTE_CATEGORY_MAP,
  type VoteCampaignView,
  type VoteCandidateView,
  type VoteTransactionView,
} from "@/modules/votes/types";
import { VoteModal } from "./VoteModal";

interface VoteCampaignViewClientProps {
  initialCampaign: VoteCampaignView;
  initialCandidateParam?: string;
}

export function VoteCampaignViewClient({
  initialCampaign,
  initialCandidateParam,
}: VoteCampaignViewClientProps) {
  const [campaign, setCampaign] = useState<VoteCampaignView>(initialCampaign);
  const [search, setSearch] = useState("");
  const [mobileLayout, setMobileLayout] = useState<"carousel" | "grid">("carousel");
  const [activeCandidate, setActiveCandidate] = useState<VoteCandidateView | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lastTxBanner, setLastTxBanner] = useState<VoteTransactionView | null>(null);
  const [cachedCover, setCachedCover] = useState<string | null>(null);
  const [cachedPhotos, setCachedPhotos] = useState<Record<string, string>>({});

  const country = getCountryByCode(campaign.countryCode);
  const category = VOTE_CATEGORY_MAP[campaign.category];
  const totalVotes = getCampaignTotalVotes(campaign);
  const rankedCandidates = useMemo(() => getRankedCandidates(campaign), [campaign]);

  // Restaure l'affiche et les portraits candidats mis en cache local si sans Vercel Blob
  useEffect(() => {
    if (!campaign.coverImageUrl) {
      const cover = readCachedEventPoster(campaign.id, campaign.slug);
      if (cover) setCachedCover(cover);
    }
    const photoMap: Record<string, string> = {};
    for (const cand of campaign.candidates) {
      if (!cand.photoUrl) {
        const local = readCachedEventPoster(cand.id, `${campaign.slug}-${cand.code}`);
        if (local) photoMap[cand.id] = local;
      }
    }
    if (Object.keys(photoMap).length > 0) {
      setCachedPhotos(photoMap);
    }
  }, [campaign]);

  // Ouvre automatiquement la modale si le visiteur arrive depuis un lien partagé ?candidat=C01
  useEffect(() => {
    if (!initialCandidateParam || campaign.status !== "OPEN") return;
    const norm = initialCandidateParam.trim().toLowerCase();
    const matched = campaign.candidates.find(
      (c) => c.code.toLowerCase() === norm || c.id.toLowerCase() === norm,
    );
    if (matched) {
      setActiveCandidate(matched);
    }
  }, [initialCandidateParam, campaign.candidates, campaign.status]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rankedCandidates;
    return rankedCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q),
    );
  }, [rankedCandidates, search]);

  function handleShareCandidate(cand: VoteCandidateView) {
    const url = `${window.location.origin}/votes/${campaign.slug}?candidat=${encodeURIComponent(cand.code)}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
    setCopiedCode(cand.code);
    window.setTimeout(() => setCopiedCode(null), 2400);
  }

  function handleWhatsAppShare(cand: VoteCandidateView) {
    const url = `${window.location.origin}/votes/${campaign.slug}?candidat=${encodeURIComponent(cand.code)}`;
    const text = `Votez pour ${cand.name} (Code ${cand.code}) dans "${campaign.title}" sur Javeroo ! Lien direct : ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const coverUrl = campaign.coverImageUrl || cachedCover || undefined;
  const podium = rankedCandidates.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Fil d'Ariane" className="mb-5 flex items-center gap-2 text-xs text-slate-600">
        <Link href="/" className="hover:text-[#1B2A4A]">
          Accueil
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/votes" className="hover:text-[#1B2A4A]">
          Votes &amp; Concours
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-semibold text-[#1B2A4A]">{campaign.title}</span>
      </nav>

      {/* Hero Bannière Concours */}
      <section
        className="relative overflow-hidden rounded-3xl text-white shadow-lg"
        style={
          coverUrl
            ? undefined
            : {
                background: `linear-gradient(135deg, ${campaign.bannerTheme.from} 0%, ${campaign.bannerTheme.via} 55%, ${campaign.bannerTheme.to} 100%)`,
              }
        }
      >
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={campaign.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F1B33]/92 via-[#1B2A4A]/80 to-[#0F1B33]/65" />

        <div className="relative grid gap-6 p-6 sm:p-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  campaign.status === "OPEN"
                    ? "bg-emerald-500 text-white"
                    : campaign.status === "PAUSED"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-600 text-white"
                }`}
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {campaign.status === "OPEN"
                  ? "Votes ouverts en direct"
                  : campaign.status === "PAUSED"
                    ? "Votes momentanément en pause"
                    : "Votes clôturés"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                {category.label} · {campaign.city}, {country.name}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-4xl">
              {campaign.title}
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-200">
              {campaign.shortSummary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-teal-300" aria-hidden="true" />
                Clôture : {formatEventDate(campaign.endsAt, campaign.timezone)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-teal-300" aria-hidden="true" />
                Par <strong>{campaign.organizer.name}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur-md lg:col-span-4">
            <div>
              <p className="text-[11px] font-semibold text-teal-200 uppercase">Voix totales</p>
              <p className="mt-1 font-display text-xl font-extrabold text-white">
                {totalVotes.toLocaleString("fr-FR")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-teal-200 uppercase">Candidats</p>
              <p className="mt-1 font-display text-xl font-extrabold text-white">
                {campaign.candidates.length}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-teal-200 uppercase">1 Vote</p>
              <p className="mt-1 font-display text-lg font-extrabold text-teal-300">
                {campaign.unitVotePriceXof === 0
                  ? "Gratuit"
                  : `${campaign.unitVotePriceXof} F`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {lastTxBanner && (
        <div
          role="status"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm text-emerald-950"
        >
          <p className="font-semibold">
            🎉 Vote enregistré (Réf. <span className="font-mono">{lastTxBanner.receiptToken}</span>) :{" "}
            <strong>+{lastTxBanner.votesCount} voix</strong> pour{" "}
            <strong>{lastTxBanner.candidateName}</strong> ({lastTxBanner.candidateCode}). Le
            classement ci-dessous est à jour !
          </p>
          <button
            type="button"
            onClick={() => setLastTxBanner(null)}
            className="text-xs font-bold text-emerald-800 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Podium en direct — rail horizontal compact sur mobile */}
      {campaign.showLiveResults ? (
        podium.length > 0 && (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:mt-8 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-[#1B2A4A] sm:text-lg">
                <Trophy className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" aria-hidden="true" />
                Top {podium.length} en direct
              </h2>
              <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                {totalVotes.toLocaleString("fr-FR")} voix · <span className="sm:hidden">Glissez →</span>
              </span>
            </div>

            <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
              {podium.map((cand) => {
                const medalStyles =
                  cand.rank === 1
                    ? "border-amber-300 bg-amber-50/70"
                    : cand.rank === 2
                      ? "border-slate-300 bg-slate-50"
                      : "border-orange-200 bg-orange-50/50";
                return (
                  <div
                    key={cand.id}
                    className={`w-[68vw] max-w-[245px] shrink-0 snap-start rounded-2xl border p-3.5 sm:w-auto sm:max-w-none sm:p-4 ${medalStyles}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1B2A4A] px-2.5 py-0.5 text-[11px] font-bold text-white">
                        {cand.rank === 1 && <Crown className="h-3 w-3 text-amber-300" />}
                        #{cand.rank} · {cand.code}
                      </span>
                      <span className="font-display text-xs font-extrabold text-teal-700 sm:text-sm">
                        {cand.sharePercent} %
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-display text-sm font-bold text-[#1B2A4A] sm:text-base">
                      {cand.name}
                    </p>
                    <p className="text-[11px] text-slate-600 sm:text-xs">
                      {cand.votesCount.toLocaleString("fr-FR")} voix
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/80 sm:h-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1B2A4A] to-teal-500 transition-all duration-500"
                        style={{ width: `${Math.max(4, cand.sharePercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-950 sm:mt-8 sm:px-5 sm:py-4">
          <EyeOff className="h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
          <p>
            <strong>Scores temporairement masqués par l&apos;organisateur</strong> pour garder le
            suspense jusqu&apos;à la cérémonie officielle. Tous les votes restent comptabilisés et
            audités en temps réel.
          </p>
        </div>
      )}

      {/* Liste des candidats : Carrousel horizontal par défaut sur mobile + bascule Grille 2 col. */}
      <section className="mt-6 sm:mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#1B2A4A] sm:text-2xl">
                <Users className="h-5 w-5 text-teal-600 sm:h-6 sm:w-6" aria-hidden="true" />
                Candidats ({filteredCandidates.length})
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">
                {mobileLayout === "carousel"
                  ? "Glissez horizontalement pour voter rapidement →"
                  : "Votez en 15 s par Mobile Money — 0 FCFA de frais ajoutés."}
              </p>
            </div>
            {/* Bascule Carrousel / Grille 2 col. sur mobile */}
            <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-0.5 text-[11px] font-bold sm:hidden">
              <button
                type="button"
                onClick={() => setMobileLayout("carousel")}
                className={`rounded-lg px-2.5 py-1 ${
                  mobileLayout === "carousel" ? "bg-[#1B2A4A] text-white" : "text-slate-600"
                }`}
              >
                Défiler →
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout("grid")}
                className={`rounded-lg px-2.5 py-1 ${
                  mobileLayout === "grid" ? "bg-[#1B2A4A] text-white" : "text-slate-600"
                }`}
              >
                Grille ×2
              </button>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom ou code (ex. C01)..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3.5 pl-10 text-sm sm:py-2.5"
            />
          </div>
        </div>

        <div
          className={
            mobileLayout === "carousel"
              ? "no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
              : "mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-3"
          }
        >
          {filteredCandidates.map((cand) => {
            const photo = cand.photoUrl || cachedPhotos[cand.id];
            const initials = cand.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <article
                key={cand.id}
                className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-teal-300 hover:shadow-md sm:rounded-3xl ${
                  mobileLayout === "carousel"
                    ? "w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none"
                    : ""
                }`}
              >
                {/* Visuel candidat */}
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden"
                  style={
                    photo
                      ? undefined
                      : {
                          background: `linear-gradient(135deg, #1B2A4A 0%, ${cand.accentColor} 100%)`,
                        }
                  }
                >
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={`Portrait de ${cand.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 font-display text-2xl font-extrabold text-white ring-2 ring-white/30 backdrop-blur-xs sm:h-24 sm:w-24 sm:text-3xl">
                        {initials}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5 sm:p-3.5">
                    <span className="rounded-full bg-[#1B2A4A]/90 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white backdrop-blur-xs sm:px-3 sm:py-1 sm:text-xs">
                      {cand.code}
                    </span>
                    {campaign.showLiveResults && (
                      <span className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-extrabold text-[#1B2A4A] shadow-xs sm:px-2.5 sm:py-1 sm:text-xs">
                        #{cand.rank}
                      </span>
                    )}
                  </div>
                </div>

                {/* Infos & actions */}
                <div className="flex flex-1 flex-col p-3.5 sm:p-5">
                  <h3 className="truncate font-display text-sm font-bold text-[#1B2A4A] sm:text-lg">
                    {cand.name}
                  </h3>
                  <p className="truncate text-[11px] font-semibold text-teal-700 sm:text-xs">
                    {cand.subtitle}
                  </p>
                  <p className="mt-1.5 hidden line-clamp-2 text-xs leading-relaxed text-slate-600 sm:block">
                    {cand.bio}
                  </p>

                  {campaign.showLiveResults && (
                    <div className="mt-2.5 sm:mt-4">
                      <div className="flex items-baseline justify-between text-[11px] sm:text-xs">
                        <span className="font-bold text-[#1B2A4A]">
                          {cand.votesCount.toLocaleString("fr-FR")} voix
                        </span>
                        <span className="font-bold text-teal-700">{cand.sharePercent} %</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(3, cand.sharePercent)}%`,
                            backgroundColor: cand.accentColor,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-1.5 pt-3 sm:gap-2 sm:pt-5">
                    <button
                      type="button"
                      disabled={campaign.status !== "OPEN"}
                      onClick={() => setActiveCandidate(cand)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[#1B2A4A] px-2.5 py-2 text-[11px] font-bold text-white shadow-xs transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-45 sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {campaign.status === "OPEN"
                          ? campaign.unitVotePriceXof === 0
                            ? "Voter"
                            : `Voter (${campaign.unitVotePriceXof} F)`
                          : "Fermé"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(cand)}
                      title="Partager sur WhatsApp"
                      className="hidden rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 sm:inline-flex"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareCandidate(cand)}
                      aria-label={`Copier le lien direct de ${cand.name}`}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 sm:p-2.5"
                    >
                      {copiedCode === cand.code ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Share2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Règlement & Transparence */}
      <section className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-8">
          <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
            À propos &amp; Règlement du concours
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            {campaign.description.split("\n\n").map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-teal-200 bg-teal-50/70 p-6 lg:col-span-4">
          <p className="flex items-center gap-2 font-display text-base font-bold text-[#1B2A4A]">
            <ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden="true" />
            Vote transparent &amp; vérifié
          </p>
          <ul className="space-y-2 text-xs text-slate-700">
            <li>• Aucune création de compte requise pour voter.</li>
            <li>• 0 FCFA de frais ajoutés au votant (prix exact par voix).</li>
            <li>• Reçu de vote vérifié généré instantanément.</li>
            <li>• Paiement Mobile Money UEMOA (Orange Money, Wave, Moov, MTN, Mixx, Carte).</li>
          </ul>
          <Link
            href="/votes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voir tous les concours en cours
          </Link>
        </div>
      </section>

      <VoteModal
        campaign={campaign}
        candidate={activeCandidate}
        candidatePhoto={
          activeCandidate
            ? activeCandidate.photoUrl || cachedPhotos[activeCandidate.id]
            : undefined
        }
        onClose={() => setActiveCandidate(null)}
        onVoteSuccess={(updatedCampaign, tx) => {
          setCampaign(updatedCampaign);
          setLastTxBanner(tx);
        }}
      />
    </div>
  );
}

