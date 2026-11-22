import Link from "next/link";
import { BadgeCheck, Calendar, MapPin } from "lucide-react";
import { formatEventDate, formatXof, getCountryByCode } from "@/config/uemoa";
import {
  getEventAvailability,
  getEventMinPriceXof,
  type EventView,
} from "@/modules/events/types";
import { EventPoster } from "./EventPoster";

interface EventCardProps {
  event: EventView;
}

export function EventCard({ event }: EventCardProps) {
  const minPrice = getEventMinPriceXof(event);
  const availability = getEventAvailability(event);
  const country = getCountryByCode(event.countryCode);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <Link href={`/evenements/${event.slug}`} className="block focus:outline-none">
        <EventPoster event={event} compact />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            {formatEventDate(event.startsAt, event.timezone)}
          </span>
          {availability.status === "LOW_STOCK" && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              Dernières places
            </span>
          )}
          {availability.status === "SOLD_OUT" && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
              Complet
            </span>
          )}
        </div>

        <h3 className="mt-2 font-display text-base font-bold leading-snug text-[#1B2A4A] group-hover:text-teal-700">
          <Link href={`/evenements/${event.slug}`}>{event.title}</Link>
        </h3>

        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">
            {event.venueName} · {event.city}, {country.name}
          </span>
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <span>Par</span>
          <Link
            href={`/promoteurs/${event.organizer.slug}`}
            className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-teal-700 hover:underline"
          >
            {event.organizer.name}
            {event.organizer.isVerified && (
              <BadgeCheck className="h-3.5 w-3.5 text-teal-600" aria-label="Organisateur vérifié" />
            )}
          </Link>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4">
          <div>
            <span className="block text-[11px] font-medium text-slate-500">À partir de</span>
            <span className="font-display text-base font-bold text-[#1B2A4A]">
              {minPrice === 0 ? "Gratuit" : formatXof(minPrice)}
            </span>
          </div>
          <Link
            href={`/evenements/${event.slug}`}
            className="rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
          >
            Voir les billets
          </Link>
        </div>
      </div>
    </article>
  );
}

