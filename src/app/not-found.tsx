import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B2A4A] text-teal-300">
        <Ticket className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-bold tracking-wider text-teal-700 uppercase">Erreur 404</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-[#1B2A4A]">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-600">
        L&apos;événement, la commande ou la page que vous cherchez n&apos;existe pas ou n&apos;est
        plus disponible.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/evenements"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
        >
          Explorer les événements
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

