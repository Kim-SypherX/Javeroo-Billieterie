"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, Ticket } from "lucide-react";
import { formatEventDate, formatXof } from "@/config/uemoa";
import type { OrderView } from "@/modules/events/types";

export default function MesBilletsPage() {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderView[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de rechercher vos billets.");
        setOrders([]);
      } else {
        setOrders(data.orders ?? []);
        setSearched(true);
      }
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
          Accès sans mot de passe
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl">
          Retrouver mes billets
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Saisissez le numéro WhatsApp / téléphone ou l&apos;adresse e-mail utilisé lors de votre
          achat pour afficher et retélécharger vos billets QR code.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="lookup-contact" className="sr-only">
              Numéro de téléphone ou adresse e-mail
            </label>
            <input
              id="lookup-contact"
              name="contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ex. +226 70 00 00 00 ou vous@exemple.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Rechercher
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {searched && orders.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <Ticket className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 font-semibold text-[#1B2A4A]">
              Aucune commande trouvée pour « {contact} »
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Vérifiez l&apos;indicatif téléphonique ou effectuez d&apos;abord une réservation depuis
              le catalogue.
            </p>
            <Link
              href="/evenements"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:underline"
            >
              Explorer les événements
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase">
              {orders.length} commande{orders.length > 1 ? "s" : ""} trouvée
              {orders.length > 1 ? "s" : ""}
            </h2>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/commandes/${order.publicToken}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-400 hover:bg-teal-50/40"
              >
                <div>
                  <p className="font-display text-base font-bold text-[#1B2A4A]">
                    {order.eventTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {formatEventDate(order.eventStartsAt)} · {order.eventCity} ·{" "}
                    {order.tickets.length} billet(s) ·{" "}
                    {order.totalToPayXof === 0 ? "Gratuit" : formatXof(order.totalToPayXof)}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white">
                  Afficher QR
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

