import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Mail, MapPin, Phone } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { getCountryByCode } from "@/config/uemoa";
import { getOrganizerBySlug } from "@/modules/events/store";

export const dynamic = "force-dynamic";

interface OrganizerPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: OrganizerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = getOrganizerBySlug(slug);
  if (!data) return { title: "Organisateur introuvable" };
  return {
    title: `${data.organizer.name} — Événements & Billetterie`,
    description: data.organizer.bio,
  };
}

export default async function OrganizerProfilePage({ params }: OrganizerPageProps) {
  const { slug } = await params;
  const data = getOrganizerBySlug(slug);
  if (!data) notFound();

  const { organizer, events } = data;
  const country = getCountryByCode(organizer.countryCode);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/evenements"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-[#1B2A4A]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux événements
      </Link>

      <section
        className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="org-title"
      >
        <div
          className="h-28 w-full"
          style={{
            background: `linear-gradient(135deg, ${organizer.accentFrom}, ${organizer.accentTo})`,
          }}
        />
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-[#1B2A4A] font-display text-2xl font-bold text-teal-300 shadow-md">
                {organizer.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="pb-1">
                <h1
                  id="org-title"
                  className="flex items-center gap-2 font-display text-2xl font-bold text-[#1B2A4A]"
                >
                  {organizer.name}
                  {organizer.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      Vérifié
                    </span>
                  )}
                </h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                  {organizer.city}, {country.name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium">
                <Phone className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                {organizer.supportPhone}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
                {organizer.supportEmail}
              </span>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-700">{organizer.bio}</p>
        </div>
      </section>

      <section aria-labelledby="org-events-title" className="mt-10">
        <h2 id="org-events-title" className="font-display text-2xl font-bold text-[#1B2A4A]">
          Événements organisés ({events.length})
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}

