"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, QrCode, Shield, Ticket, User, X } from "lucide-react";
import type { SessionPayload } from "@/modules/auth/session";

const NAV_ITEMS = [
  { href: "/evenements", label: "Événements" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/mes-billets", label: "Mes billets" },
  { href: "/scan", label: "Scan entrée" },
];

interface HeaderProps {
  session: SessionPayload | null;
}

export function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[#1B2A4A] transition-opacity hover:opacity-90"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B2A4A] text-white shadow-sm">
            <Ticket className="h-5 w-5 text-[#5EEAD4]" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight">Javeroo</span>
            <span className="text-[10px] font-semibold tracking-wider text-teal-600 uppercase">
              Billetterie UEMOA
            </span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-[#1B2A4A]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {session ? (
            <>
              {session.role === "PLATFORM_ADMIN" && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-600"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                {session.organizationName ?? session.fullName}
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                aria-label="Se déconnecter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/connexion"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Connexion
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111D35]"
              >
                Créer un événement
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg md:hidden"
        >
          <nav aria-label="Navigation mobile" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Espace Organisateur ({session.fullName})
                  </Link>
                  {session.role === "PLATFORM_ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      Back-office Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-red-700"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800"
                  >
                    Connexion Organisateur
                  </Link>
                  <Link
                    href="/inscription"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Créer un événement
                  </Link>
                </>
              )}
              <Link
                href="/scan"
                onClick={() => setMobileOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                <QrCode className="h-4 w-4 text-teal-600" aria-hidden="true" />
                Ouvrir le contrôle porte
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
