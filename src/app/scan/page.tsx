import type { Metadata } from "next";
import { ScanConsole } from "@/components/ScanConsole";
import { listAllEvents } from "@/modules/events/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contrôle d'accès QR (Porte)",
  robots: { index: false, follow: false },
};

interface ScanPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const params = await searchParams;
  const eventId = typeof params.eventId === "string" ? params.eventId : undefined;
  const code = typeof params.code === "string" ? params.code : undefined;
  const accessCode = typeof params.accessCode === "string" ? params.accessCode : undefined;

  const events = listAllEvents().map((e) => ({
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
