"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doLogin(idValue: string, pwdValue: string, target: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: idValue, password: pwdValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Connexion impossible.");
        setSubmitting(false);
        return;
      }
      router.push(target);
      router.refresh();
    } catch {
      setError("Erreur réseau lors de la connexion.");
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void doLogin(emailOrPhone, password, nextUrl);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
          Espace Organisateur &amp; Administration
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#1B2A4A]">Connexion</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Connectez-vous avec votre e-mail ou votre numéro WhatsApp. Pas besoin de compte pour
          acheter un billet !
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-id" className="block text-sm font-semibold text-slate-800">
              E-mail ou téléphone
            </label>
            <input
              id="login-id"
              name="emailOrPhone"
              type="text"
              required
              autoComplete="username"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="organisateur@javeroo.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-800">
              Mot de passe
            </label>
            <div className="relative mt-1.5">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-11 pl-3.5 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Se connecter
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Nouvel organisateur ?{" "}
          <Link href="/inscription" className="font-bold text-teal-700 hover:underline">
            Créer un espace gratuitement
          </Link>
        </p>

        {/* Accès rapides de démonstration (local, Preview ou NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true) */}
        {(process.env.NODE_ENV !== "production" ||
          process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true") && (
          <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs text-teal-950">
            <p className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
              Comptes de démonstration locale (désactivés en production)
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void doLogin("organisateur@javeroo.com", "Javeroo2026!", "/dashboard")}
                className="rounded-xl border border-teal-300 bg-white px-3 py-2 text-left font-semibold text-[#1B2A4A] hover:bg-teal-100"
              >
                Connexion Organisateur · Faso Scène Productions
                <span className="block font-mono text-[11px] font-normal text-slate-500">
                  organisateur@javeroo.com
                </span>
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void doLogin("admin@javeroo.com", "AdminJaveroo2026!", "/admin")}
                className="rounded-xl border border-teal-300 bg-white px-3 py-2 text-left font-semibold text-[#1B2A4A] hover:bg-teal-100"
              >
                Connexion Admin Plateforme · Back-office /admin
                <span className="block font-mono text-[11px] font-normal text-slate-500">
                  admin@javeroo.com
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Chargement...</div>}>
      <ConnexionForm />
    </Suspense>
  );
}

