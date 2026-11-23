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

      {/* Podium en direct */}
      {campaign.showLiveResults ? (
        podium.length > 0 && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
                <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
                Classement provisoire en temps réel (Top {podium.length})
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Total comptabilisé : {totalVotes.toLocaleString("fr-FR")} voix
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {podium.map((cand) => {
                const medalStyles =
                  cand.rank === 1
                    ? "border-amber-300 bg-amber-50/70"
                    : cand.rank === 2
                      ? "border-slate-300 bg-slate-50"
                      : "border-orange-200 bg-orange-50/50";
                return (
                  <div key={cand.id} className={`rounded-2xl border p-4 ${medalStyles}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1B2A4A] px-2.5 py-0.5 text-xs font-bold text-white">
                        {cand.rank === 1 && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                        #{cand.rank} · {cand.code}
                      </span>
                      <span className="font-display text-sm font-extrabold text-teal-700">
                        {cand.sharePercent} %
                      </span>
                    </div>
                    <p className="mt-2 font-display text-base font-bold text-[#1B2A4A]">
                      {cand.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {cand.votesCount.toLocaleString("fr-FR")} voix
                    </p>
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/80">
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
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-xs text-indigo-950">
          <EyeOff className="h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
          <p>
            <strong>Scores temporairement masqués par l&apos;organisateur</strong> pour garder le
            suspense jusqu&apos;à la cérémonie officielle. Tous les votes restent comptabilisés et
            audités en temps réel.
          </p>
        </div>
      )}

      {/* Liste des candidats + recherche instantanée */}
      <section className="mt-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-[#1B2A4A]">
              <Users className="h-6 w-6 text-teal-600" aria-hidden="true" />
              Choisissez votre candidat ({filteredCandidates.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Votez en 15 secondes par Mobile Money (sans compte) — 0 FCFA de frais ajoutés.
            </p>
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
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:border-teal-300 hover:shadow-md"
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
                      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 font-display text-3xl font-extrabold text-white ring-2 ring-white/30 backdrop-blur-xs">
                        {initials}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3.5">
                    <span className="rounded-full bg-[#1B2A4A]/90 px-3 py-1 font-mono text-xs font-bold text-white backdrop-blur-xs">
                      Code {cand.code}
                    </span>
                    {campaign.showLiveResults && (
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-[#1B2A4A] shadow-xs">
                        #{cand.rank}
                      </span>
                    )}
                  </div>
                </div>

                {/* Infos & actions */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-bold text-[#1B2A4A]">{cand.name}</h3>
                  <p className="text-xs font-semibold text-teal-700">{cand.subtitle}</p>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {cand.bio}
                  </p>

                  {campaign.showLiveResults && (
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-[#1B2A4A]">
                          {cand.votesCount.toLocaleString("fr-FR")} voix
                        </span>
                        <span className="font-bold text-teal-700">{cand.sharePercent} %</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
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

                  <div className="mt-auto flex items-center gap-2 pt-5">
                    <button
                      type="button"
                      disabled={campaign.status !== "OPEN"}
                      onClick={() => setActiveCandidate(cand)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      {campaign.status === "OPEN"
                        ? campaign.unitVotePriceXof === 0
                          ? "Voter"
                          : `Voter (${formatXof(campaign.unitVotePriceXof)})`
                        : "Votes fermés"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppShare(cand)}
                      title="Partager sur WhatsApp"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareCandidate(cand)}
                      aria-label={`Copier le lien direct de ${cand.name}`}
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
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

