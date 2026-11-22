import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/AdminConsole";
import { getCurrentSession } from "@/modules/auth/session";
import { listAllEvents } from "@/modules/events/store";
import { listAllAdminOperations } from "@/modules/operations/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration Plateforme",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/connexion?next=/admin");
  }
  if (session.role !== "PLATFORM_ADMIN") {
    redirect("/dashboard");
  }

  const ops = listAllAdminOperations();
  const events = listAllEvents();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-wider text-indigo-700 uppercase">
          Back-Office Plateforme · Accès Administrateur
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">
          Modération, KYC, Reversements &amp; Audit
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Supervision centralisée des dossiers d&apos;identité, virements organisateurs et qualité
          du catalogue UEMOA.
        </p>
      </div>

      <AdminConsole
        kycSubmissions={ops.kycSubmissions}
        payouts={ops.payouts}
        events={events}
        auditLogs={ops.auditLogs}
      />
    </div>
  );
}

