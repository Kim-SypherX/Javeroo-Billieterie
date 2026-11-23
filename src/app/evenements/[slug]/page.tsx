import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { EventDetailActions } from "@/components/EventDetailActions";
import { EventPoster } from "@/components/EventPoster";
import { EVENT_CATEGORY_MAP, SITE_CONFIG } from "@/config/site";
import {
  formatEventDate,
  formatEventTime,
  formatXof,
  getCountryByCode,
  PAYMENT_METHODS,
} from "@/config/uemoa";
import { getEventBySlug } from "@/modules/events/store";
import { getEventMinPriceXof, getTierRemaining } from "@/modules/events/types";

export const dynamic = "force-dynamic";

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) {
    return { title: "Événement introuvable" };
  }
  const dateLabel = formatEventDate(event.startsAt, event.timezone);
  const title = `${event.title} à ${event.city} (${dateLabel}) — Billets`;
  return {
    title,
    description: event.shortSummary,
    openGraph: {
      title: `${title} | ${SITE_CONFIG.brandName}`,
      description: event.shortSummary,
      type: "article",
    },
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const country = getCountryByCode(event.countryCode);
  const category = EVENT_CATEGORY_MAP[event.category];
  const minPrice = getEventMinPriceXof(event);
  const shareUrl = `${SITE_CONFIG.baseUrl}/evenements/${event.slug}`;
  const mapsUrl =
    event.mapsUrl ||
    (event.latitude !== undefined && event.longitude !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${event.venueName}, ${event.venueAddress}, ${event.city}, ${country.name}`,
        )}`);

  // Données structurées JSON-LD schema.org/Event pour rich snippets Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.shortSummary,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.venueName,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.venueAddress,
        addressLocality: event.city,
        addressCountry: event.countryCode,
      },
    },
    organizer: {
      "@type": "Organization",
      name: event.organizer.name,
      url: `${SITE_CONFIG.baseUrl}/promoteurs/${event.organizer.slug}`,
    },
    offers: event.tiers.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      price: tier.priceXof,
      priceCurrency: "XOF",
      availability:
        getTierRemaining(tier) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: shareUrl,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center gap-2 text-xs text-slate-600">
        <Link href="/" className="hover:text-[#1B2A4A]">
          Accueil
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/evenements" className="hover:text-[#1B2A4A]">
          Événements
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-semibold text-[#1B2A4A]">{event.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <EventPoster event={event} allowLightbox />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
                {category.label}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {event.city}, {country.name}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl">
              {event.title}
            </h1>

            <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Date &amp; Heure</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#1B2A4A]">
                    {formatEventDate(event.startsAt, event.timezone)}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatEventTime(event.startsAt, event.timezone)} –{" "}
                    {formatEventTime(event.endsAt, event.timezone)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Lieu &amp; Accès</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#1B2A4A]">{event.venueName}</p>
                  <p className="text-xs text-slate-600">{event.venueAddress}</p>
                  {event.locationHint && (
                    <p className="mt-1 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">
                      <strong>Repère :</strong> {event.locationHint}
                    </p>
                  )}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
                  >
                    Suivre l&apos;itinéraire GPS (Google Maps)
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="font-display text-lg font-bold text-[#1B2A4A]">
                À propos de cet événement
              </h2>
              <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-slate-700">
                {event.description.split("\n\n").map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>

            {/* Carte Organisateur vérifié */}
            <div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Organisé par</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-display text-base font-bold text-[#1B2A4A]">
                  {event.organizer.name}
                  {event.organizer.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-teal-600" aria-label="Organisateur vérifié" />
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{event.organizer.bio}</p>
              </div>
              <Link
                href={`/promoteurs/${event.organizer.slug}`}
                className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#1B2A4A] hover:bg-slate-100"
              >
                Voir le profil
              </Link>
            </div>
          </div>

          <Link
            href="/evenements"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#1B2A4A]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour au catalogue
          </Link>
        </div>

        {/* Colonne Billetterie sticky */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#1B2A4A]">Billets</h2>
                <p className="text-xs text-slate-600">
                  Achat web immédiat · Sans compte · Zéro publicité
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[11px] text-slate-500">Dès</span>
                <span className="font-display text-xl font-bold text-teal-700">
                  {minPrice === 0 ? "Gratuit" : formatXof(minPrice)}
                </span>
              </div>
            </div>

            {event.promoCodes.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs text-teal-900">
                <Tag className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
                <span>
                  Code promo de démonstration disponible :{" "}
                  <strong className="font-mono">{event.promoCodes[0]?.code}</strong> (applicable
                  directement sur le web !).
                </span>
              </div>
            )}

            <EventDetailActions event={event} shareUrl={shareUrl} />

            <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              <p className="flex items-center gap-1.5 font-bold text-[#1B2A4A]">
                <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden="true" />
                Paiements acceptés ({country.name})
              </p>
              <p className="mt-1.5">
                {country.paymentMethods.map((m) => PAYMENT_METHODS[m].shortName).join(" · ")}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                0 FCFA de frais cachés : vous payez exactement le prix affiché sur le billet.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

