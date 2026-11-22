"use client";

import { Printer } from "lucide-react";

export function PrintTicketsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimer / Enregistrer en PDF
    </button>
  );
}

