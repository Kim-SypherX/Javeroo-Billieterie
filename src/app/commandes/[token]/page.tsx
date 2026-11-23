import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, CheckCircle2, Download, MapPin, QrCode } from "lucide-react";
import { PrintTicketsButton } from "@/components/PrintTicketsButton";
import { formatEventDate, formatEventTime, formatXof, PAYMENT_METHODS } from "@/config/uemoa";
import { getOrderByToken } from "@/modules/events/store";
import {
  hydrateOrderWithQrImages,
  readSignedOrdersFromCookie,
} from "@/modules/orders/receipt-cookie";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vos billets confirmés",
  robots: { index: false, follow: false },
};

interface OrderPageProps {
  params: Promise<{ token: string }>;
}

export default async function OrderConfirmationPage({ params }: OrderPageProps) {
  const { token } = await params;
  let order = await getOrderByToken(token);

  if (!order) {
    const cookieOrders = await readSignedOrdersFromCookie();
    const matched = cookieOrders.find((o) => o.publicToken === token);
    if (matched) {
      order = await hydrateOrderWithQrImages(matched);
    }
  }

  if (!order) notFound();

  const firstTicket = order.tickets[0];
  const scanTestHref = firstTicket
    ? `/scan?eventId=${encodeURIComponent(order.eventId)}&code=${encodeURIComponent(firstTicket.qrPayload)}`
    : "/scan";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-teal-200 bg-teal-50 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-teal-800 uppercase">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Commande confirmée · Réf. {order.publicToken}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl">
              Vos {order.tickets.length} billet{order.tickets.length > 1 ? "s" : ""} sont prêts !
            </h1>
            <p className="mt-1 text-sm text-teal-900">
              Titulaire : <strong>{order.buyerName}</strong> ({order.buyerPhone}) · Paiement :{" "}
              <strong>{PAYMENT_METHODS[order.paymentMethod].shortName}</strong> (
              {order.totalToPayXof === 0 ? "Gratuit" : formatXof(order.totalToPayXof)}).
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <a
              href={`/api/orders/${order.publicToken}/pdf`}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Télécharger PDF
            </a>
            <PrintTicketsButton />
          </div>
        </div>
      </div>

      {/* Cartes billets individuels avec QR code signé */}
      <div className="mt-8 space-y-6">
        {order.tickets.map((ticket, index) => (
          <article
            key={ticket.id}
            className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:grid-cols-12"
          >
            <div className="flex flex-col justify-between p-6 sm:col-span-8">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#1B2A4A] px-3 py-1 text-xs font-bold text-white">
                    Billet #{index + 1} · {ticket.tierName}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      ticket.status === "USED"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {ticket.status === "USED" ? "Déjà scanné" : "Valide"}
                  </span>
                </div>

                <h2 className="mt-3 font-display text-xl font-bold text-[#1B2A4A]">
                  {ticket.eventTitle}
                </h2>

                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    {formatEventDate(ticket.eventStartsAt)} à {formatEventTime(ticket.eventStartsAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    {ticket.eventVenue}, {ticket.eventCity}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-dashed border-slate-200 pt-4 text-xs">
                <div>
                  <span className="block text-slate-500">Participant</span>
                  <span className="font-bold text-[#1B2A4A]">{ticket.attendeeName}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Code de secours (porte)</span>
                  <span className="font-mono text-sm font-bold text-teal-700">
                    {ticket.shortCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border-t border-dashed border-slate-200 bg-slate-50 p-6 sm:col-span-4 sm:border-t-0 sm:border-l">
              {ticket.qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.qrDataUrl}
                  alt={`QR Code du billet ${ticket.shortCode}`}
                  width={180}
                  height={180}
                  className="rounded-xl border border-slate-200 bg-white p-2"
                />
              )}
              <p className="mt-2 text-center font-mono text-xs font-bold text-[#1B2A4A]">
                {ticket.shortCode}
              </p>
              <p className="mt-1 text-center text-[11px] text-slate-500">
                QR signé cryptographiquement (vérifiable hors-ligne)
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Lien direct pour tester le scan de ces billets */}
      <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-700">
          <p className="font-bold text-[#1B2A4A]">Tester le contrôle d&apos;entrée dès maintenant</p>
          <p className="text-xs text-slate-600">
            Le QR signé du billet <strong className="font-mono">{firstTicket?.shortCode}</strong> est
            pré-rempli automatiquement (1er passage = Vert, 2e passage = Rouge anti-doublon).
          </p>
        </div>
        <Link
          href={scanTestHref}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <QrCode className="h-4 w-4" aria-hidden="true" />
          Tester sur l&apos;outil Scan
        </Link>
      </div>
    </div>
  );
}
