"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { formatEventDate, getCountryByCode } from "@/config/uemoa";
import type { EventView } from "@/modules/events/types";
import { readCachedEventPoster } from "@/modules/media/client-poster";

interface EventPosterProps {
  event: EventView;
  compact?: boolean;
  allowLightbox?: boolean;
}

export function EventPoster({ event, compact = false, allowLightbox = false }: EventPosterProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cachedCover, setCachedCover] = useState<string | null>(null);
  const country = getCountryByCode(event.countryCode);
  const { from, via, to, badge, motif } = event.posterTheme;

  useEffect(() => {
    if (!event.coverImageUrl) {
      const localCover = readCachedEventPoster(event.id, event.slug);
      if (localCover) {
        setCachedCover(localCover);
      }
    }
  }, [event.coverImageUrl, event.id, event.slug]);

  const resolvedCoverUrl = event.coverImageUrl || cachedCover || undefined;

  if (resolvedCoverUrl) {
    return (
      <>
        <div
          className={`relative overflow-hidden bg-slate-900 ${compact ? "aspect-[16/10]" : "aspect-[16/9]"} w-full`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedCoverUrl}
            alt={`Affiche officielle : ${event.title} à ${event.city}`}
            width={1200}
            height={675}
            loading={compact ? "lazy" : "eager"}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/60 to-transparent p-3.5 text-white">
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-xs">
              {badge}
            </span>
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs">
              {country.code} · {event.city}
            </span>
          </div>
          {allowLightbox && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Voir l'affiche en plein écran"
              className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-black/90"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              Affiche entière
            </button>
          )}
        </div>

        {lightboxOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Affiche complète de ${event.title}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Fermer l'aperçu plein écran"
              className="fixed top-4 right-4 rounded-xl bg-white/15 p-2.5 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedCoverUrl}
              alt={`Affiche complète : ${event.title}`}
              className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${compact ? "aspect-[16/10]" : "aspect-[16/9]"} w-full select-none`}
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${via} 55%, ${to} 100%)`,
      }}
      role="img"
      aria-label={`Affiche de l'événement ${event.title} à ${event.city}`}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
      >
        {motif === "waves" && (
          <>
            <path d="M0 170 Q100 120 200 170 T400 170 L400 240 L0 240 Z" fill="#FFFFFF" />
            <path d="M0 205 Q120 155 240 205 T400 195 L400 240 L0 240 Z" fill="#5EEAD4" />
          </>
        )}
        {motif === "circles" && (
          <>
            <circle cx="330" cy="40" r="90" fill="#FFFFFF" />
            <circle cx="60" cy="210" r="70" fill="#5EEAD4" />
          </>
        )}
        {motif === "grid" && (
          <path
            d="M0 60 H400 M0 120 H400 M0 180 H400 M80 0 V240 M160 0 V240 M240 0 V240 M320 0 V240"
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        )}
        {motif === "beams" && <polygon points="240,0 400,0 400,240 120,240" fill="#FFFFFF" />}
      </svg>

      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5 text-white">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm">
            {badge}
          </span>
          <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
            {country.code} · {event.city}
          </span>
        </div>

        <div>
          <p className="text-xs font-medium text-teal-200">
            {formatEventDate(event.startsAt, event.timezone)}
          </p>
          <p
            className={`mt-1 font-display font-bold leading-snug text-white drop-shadow-sm ${
              compact ? "line-clamp-2 text-base sm:text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            {event.title}
          </p>
        </div>
      </div>
    </div>
  );
}
