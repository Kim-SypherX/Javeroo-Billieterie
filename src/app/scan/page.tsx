import type { Metadata } from "next";
import { ScanConsole } from "@/components/ScanConsole";
import { getCurrentSession } from "@/modules/auth/session";
import { hydrateCustomEventsIntoStore } from "@/modules/events/custom-event-cookie";
import { getEventById, listAllEvents, listEventsForOrganization } from "@/modules/events/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrôle d'accès QR (Porte)",
  robots: { index: false, follow: false },
};

interface ScanPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  await hydrateCustomEventsIntoStore();
  const params = await searchParams;
  const eventId = typeof params.eventId === "string" ? params.eventId : undefined;
  const code = typeof params.code === "string" ? params.code : undefined;
  const accessCode = typeof params.accessCode === "string" ? params.accessCode : undefined;

  const session = await getCurrentSession();

  // Isolation : un organisateur connecté ne voit que ses propres événements sur /scan
  // (plus éventuellement l'événement ciblé s'il clique sur "Tester sur l'outil Scan" depuis un reçu de billet).
  let sourceEvents = listAllEvents();
  if (session && session.role === "ORGANIZER" && session.organizationId) {
    const ownEvents = listEventsForOrganization(session.organizationId);
    if (eventId && !ownEvents.some((e) => e.id === eventId)) {
      const target = getEventById(eventId);
      sourceEvents = target ? [target, ...ownEvents] : ownEvents;
    } else {
      sourceEvents = ownEvents;
    }
  }

  const events = sourceEvents.map((e) => ({
    id: e.id,
    title: e.title,
    city: e.city,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <ScanConsole
        events={events}
        initialEventId={eventId}
        initialCode={code}
        initialAccessCode={accessCode}
      />
    </div>
  );
}
