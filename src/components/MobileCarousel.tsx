"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobileCarouselProps {
  children: React.ReactNode;
  /** Classes de grille appliquées à partir de sm: (desktop/tablette) */
  gridClassName: string;
  /** Libellé accessible du carrousel */
  ariaLabel?: string;
}

/**
 * Carrousel mobile plein-cadre : affiche exactement 1 carte complète par écran sur téléphone
 * (zéro carte coupée sur le bord droit) avec indicateurs points + flèches + swipe tactile natif.
 * Bascule automatiquement en grille CSS classique sur tablette/desktop (sm:+).
 */
export function MobileCarousel({
  children,
  gridClassName,
  ariaLabel = "Carrousel horizontal",
}: MobileCarouselProps) {
  const items = React.Children.toArray(children);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const count = items.length;

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  const handleScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.max(0, Math.min(count - 1, idx));
    setActiveIndex(clamped);
  }, [count]);

  function scrollToIndex(targetIdx: number) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(count - 1, targetIdx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActiveIndex(clamped);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        aria-label={ariaLabel}
        className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto sm:overflow-visible ${gridClassName}`}
      >
        {items.map((child, idx) => (
          <div key={idx} className="w-full shrink-0 snap-center sm:w-auto sm:shrink">
            {child}
          </div>
        ))}
      </div>

      {/* Contrôles mobiles propres : flèches + points + compteur (masqués sur sm:+) */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Carte précédente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1B2A4A] shadow-2xs transition hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToIndex(idx)}
                aria-label={`Aller à la carte ${idx + 1} sur ${count}`}
                aria-current={idx === activeIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${
                  idx === activeIndex ? "w-6 bg-teal-600" : "w-2 bg-slate-300"
                }`}
              />
            ))}
            <span className="ml-1.5 text-[11px] font-bold text-slate-500">
              {activeIndex + 1}/{count}
            </span>
          </div>

          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === count - 1}
            aria-label="Carte suivante"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1B2A4A] shadow-2xs transition hover:bg-slate-50 disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

