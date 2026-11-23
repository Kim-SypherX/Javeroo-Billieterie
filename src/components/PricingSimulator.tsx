"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { formatXof } from "@/config/uemoa";
import { calculateOrderPricing } from "@/modules/checkout/pricing";

export function PricingSimulator() {
  const [ticketPrice, setTicketPrice] = useState(5000);
  const [ticketCount, setTicketCount] = useState(200);

  const commissionBps =
    ticketCount >= PRICING_CONFIG.enterpriseTicketThreshold
      ? PRICING_CONFIG.enterpriseCommissionBps
      : PRICING_CONFIG.standardCommissionBps;

  const summary = useMemo(
    () =>
      calculateOrderPricing({
        items: [
          {
            tierId: "sim",
            tierName: "Billet standard",
            unitPriceXof: ticketPrice,
            quantity: ticketCount,
          },
        ],
        feeBearer: "ORGANIZER",
        commissionBps,
      }),
    [ticketPrice, ticketCount, commissionBps],
  );

  return (
    <section
      aria-labelledby="simulator-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Calculator className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="simulator-heading" className="font-display text-xl font-bold text-[#1B2A4A]">
            Simulateur de recettes organisateur
          </h2>
          <p className="text-xs text-slate-600">
            Le spectateur paie toujours exactement le prix affiché ; la commission ({commissionBps / 100}{" "}
            %) est déduite des recettes avant reversement.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="sim-price" className="font-semibold text-slate-800">
                Prix d&apos;un billet (FCFA)
              </label>
              <span className="font-display font-bold text-[#1B2A4A]">
                {ticketPrice === 0 ? "Gratuit" : formatXof(ticketPrice)}
              </span>
            </div>
            <input
              id="sim-price"
              name="ticketPrice"
              type="range"
              min={0}
              max={50000}
              step={500}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <label htmlFor="sim-count" className="font-semibold text-slate-800">
                Nombre de billets vendus
              </label>
              <span className="font-display font-bold text-[#1B2A4A]">
                {ticketCount.toLocaleString("fr-FR")} billets
              </span>
            </div>
            <input
              id="sim-count"
              name="ticketCount"
              type="range"
              min={10}
              max={5000}
              step={10}
              value={ticketCount}
              onChange={(e) => setTicketCount(Number(e.target.value))}
              className="mt-2 w-full accent-teal-600"
            />
            {ticketCount >= PRICING_CONFIG.enterpriseTicketThreshold && (
              <p className="mt-1 text-xs font-semibold text-teal-700">
                Palier grands comptes activé : {PRICING_CONFIG.enterpriseCommissionPercent} % au lieu
                de {PRICING_CONFIG.standardCommissionPercent} % !
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            <p className="font-bold text-[#1B2A4A]">Règle simple et unique</p>
            <p className="mt-1 leading-relaxed">
              Aucun frais supplémentaire n&apos;est ajouté au spectateur : vous connaissez en temps
              réel votre total brut généré, la commission Javeroo, et exactement ce qui vous revient.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-[#1B2A4A] p-6 text-white">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Prix payé par un spectateur</span>
              <span className="font-semibold text-white">
                {ticketPrice === 0 ? "Gratuit" : formatXof(ticketPrice)}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total brut généré</span>
              <span className="font-semibold text-white">{formatXof(summary.subtotalXof)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Commission Javeroo ({commissionBps / 100} %)</span>
              <span className="font-semibold text-teal-300">
                −{formatXof(summary.platformCommissionXof)}
              </span>
            </div>
          </div>

          <div className="mt-6 border-t border-white/15 pt-4">
            <p className="text-xs font-semibold tracking-wider text-teal-300 uppercase">
              Net qui vous revient (reversé sous {PRICING_CONFIG.payoutSla.mobileMoneyLabel})
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-white">
              {formatXof(summary.organizerNetXof)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
