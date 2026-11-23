"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, LayoutDashboard, Shield, Ticket, Trophy } from "lucide-react";
import type { SessionPayload } from "@/modules/auth/session";

interface MobileBottomNavProps {
  session: SessionPayload | null;
}

export function MobileBottomNav({ session }: MobileBottomNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Accueil", icon: Home, exact: true },
    { href: "/votes", label: "Votes", icon: Trophy, exact: false },
    { href: "/evenements", label: "Sorties", icon: Calendar, exact: false },
    { href: "/mes-billets", label: "Billets", icon: Ticket, exact: false },
    session?.role === "PLATFORM_ADMIN"
      ? { href: "/admin", label: "Admin", icon: Shield, exact: false }
      : {
          href: session ? "/dashboard" : "/connexion",
          label: session ? "Espace" : "Compte",
          icon: LayoutDashboard,
          exact: false,
        },
  ];

  return (
    <nav
      aria-label="Navigation rapide mobile"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-1.5 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-bold transition ${
                  active ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:text-[#1B2A4A]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-teal-600" : "text-slate-500"}`}
                  aria-hidden="true"
                />
                <span className="mt-0.5 truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

