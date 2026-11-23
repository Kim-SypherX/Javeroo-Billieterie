"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Calendar, Flame, Trophy, Users } from "lucide-react";
import { formatEventDate, formatXof, getCountryByCode } from "@/config/uemoa";
import { readCachedEventPoster } from "@/modules/media/client-poster";
import {
  getCampaignTotalVotes,
  getRankedCandidates,
  VOTE_CATEGORY_MAP,
  type VoteCampaignView,
} from "@/modules/votes/types";

interface VoteCampaignCardProps {
  campaign: VoteCampaignView;
}

export function VoteCampaignCard({ campaign }: VoteCampaignCardProps) {
  const [cachedCover, setCachedCover] = useState<string | null>(null);
  const country = getCountryByCode(campaign.countryCode);
  const category = VOTE_CATEGORY_MAP[campaign.category];
  const totalVotes = getCampaignTotalVotes(campaign);
  const leader = getRankedCandidates(campaign)[0];

  useEffect(() => {
    if (!campaign.coverImageUrl) {
      const found = readCachedEventPoster(campaign.id, campaign.slug);
      if (found) setCachedCover(found);
    }
  }, [campaign.coverImageUrl, campaign.id, campaign.slug]);

  const coverUrl = campaign.coverImageUrl || cachedCover || undefined;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <Link href={`/votes/${campaign.slug}`} className="block focus:outline-none">
        <div
          className="relative aspect-[16/10] w-full overflow-hidden"
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
              alt={`Affiche du concours ${campaign.title}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-black/35" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-xs ${
                campaign.status === "OPEN"
                  ? "bg-emerald-500/90 text-white"
                  : campaign.status === "PAUSED"
                    ? "bg-amber-500/90 text-white"
                    : "bg-slate-700/90 text-white"
              }`}
            >
              <Flame className="h-3 w-3" aria-hidden="true" />
              {campaign.status === "OPEN"
                ? "Votes ouverts"
                : campaign.status === "PAUSED"
                  ? "En pause"
                  : "Clôturé"}
            </span>
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
              {country.code} · {campaign.city}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <span className="inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
              {category.label}
            </span>
            <h3 className="mt-1.5 line-clamp-2 font-display text-base font-bold leading-snug">
              {campaign.title}
            </h3>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-teal-700">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {totalVotes.toLocaleString("fr-FR")} voix
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {campaign.candidates.length} candidats
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {campaign.shortSummary}
        </p>

        {campaign.showLiveResults && leader && totalVotes > 0 && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-bold text-[#1B2A4A]">
                #1 {leader.name} ({leader.code})
              </span>
              <span className="shrink-0 font-bold text-teal-700">{leader.sharePercent} %</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${Math.max(8, leader.sharePercent)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 truncate">
            Par <strong className="text-slate-700">{campaign.organizer.name}</strong>
            {campaign.organizer.isVerified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-teal-600" aria-hidden="true" />
            )}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            Fin {formatEventDate(campaign.endsAt, campaign.timezone)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4">
          <div>
            <span className="block text-[11px] font-medium text-slate-500">Tarif par voix</span>
            <span className="font-display text-base font-bold text-[#1B2A4A]">
              {campaign.unitVotePriceXof === 0
                ? "Gratuit"
                : formatXof(campaign.unitVotePriceXof)}
            </span>
          </div>
          <Link
            href={`/votes/${campaign.slug}`}
            className="rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-600"
          >
            {campaign.status === "OPEN" ? "Voter maintenant" : "Voir le classement"}
          </Link>
        </div>
      </div>
    </article>
  );
}

