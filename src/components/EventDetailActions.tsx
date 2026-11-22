"use client";

import { useState } from "react";
import { Check, Copy, Share2, Ticket } from "lucide-react";
import { formatXof } from "@/config/uemoa";
import { getTierRemaining, type EventView } from "@/modules/events/types";
import { CheckoutModal } from "./CheckoutModal";

interface EventDetailActionsProps {
  event: EventView;
  shareUrl: string;
}

export function EventDetailActions({ event, shareUrl }: EventDetailActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  function openCheckout(tierId?: string) {
    setSelectedTierId(tierId);
    setModalOpen(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `${event.title} à ${event.city} — Réservez vos billets sur Javeroo : ${shareUrl}`,
  )}`;

  const anyAvailable = event.tiers.some((t) => getTierRemaining(t) > 0);

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-3">
          {event.tiers.map((tier) => {
            const remaining = getTierRemaining(tier);
            const soldOut = remaining === 0;
            return (
              <div
                key={tier.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-[#1B2A4A]">{tier.name}</h3>
                    {soldOut ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        Épuisé
                      </span>
                    ) : remaining <= 20 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        Plus que {remaining} places
                      </span>
                    ) : (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                        Disponible
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{tier.description}</p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="font-display text-lg font-bold text-[#1B2A4A]">
                    {tier.priceXof === 0 ? "Gratuit" : formatXof(tier.priceXof)}
                  </span>
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => openCheckout(tier.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
                    Choisir
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!anyAvailable}
          onClick={() => openCheckout()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-40"
        >
          <Ticket className="h-4 w-4" aria-hidden="true" />
          {anyAvailable ? "Acheter mes billets maintenant" : "Événement complet"}
        </button>

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={whatsappShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Share2 className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
            Partager sur WhatsApp
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                Lien copié !
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Copier le lien
              </>
            )}
          </button>
        </div>
      </div>

      <CheckoutModal
        event={event}
        initialTierId={selectedTierId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

