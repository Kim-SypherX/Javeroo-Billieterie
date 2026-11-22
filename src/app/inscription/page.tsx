"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { UEMOA_COUNTRIES, type UemoaCountryCode } from "@/config/uemoa";

export default function InscriptionPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState<UemoaCountryCode>("BF");
  const [city, setCity] = useState("Ouagadougou");
  const [phone, setPhone] = useState("+226 ");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Veuillez accepter les Conditions Générales (CGU & CGVPS) pour créer votre espace.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          organizationName,
          email,
          countryCode,
          city,
          phone,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de créer le compte.");
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau lors de l'inscription.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-wider text-teal-700 uppercase">
          0 FCFA / mois · Inscription Organisateur UEMOA
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-[#1B2A4A] sm:text-3xl">
          Créer votre Espace Organisateur
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Publiez vos événements gratuitement dès aujourd&apos;hui. La vérification d&apos;identité
          (KYC) ne vous est demandée qu&apos;avant votre premier retrait.
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-700">
          {[
            `${PRICING_CONFIG.standardCommissionPercent} % tout inclus sur payant`,
            "0 % sur événements gratuits",
            `Reversements sous ${PRICING_CONFIG.payoutSla.mobileMoneyLabel}`,
          ].map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-800"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {pill}
            </span>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-fullname" className="block text-sm font-semibold text-slate-800">
              Votre nom complet *
            </label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex. Fatoumata Diallo"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-org" className="block text-sm font-semibold text-slate-800">
              Nom de l&apos;organisation / promoteur *
            </label>
            <input
              id="reg-org"
              name="organizationName"
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Ex. Soleil Live Events"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-semibold text-slate-800">
              Adresse e-mail *
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@votre-structure.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-phone" className="block text-sm font-semibold text-slate-800">
              Téléphone WhatsApp *
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-country" className="block text-sm font-semibold text-slate-800">
              Pays (Zone UEMOA) *
            </label>
            <select
              id="reg-country"
              name="countryCode"
              value={countryCode}
              onChange={(e) => {
                const code = e.target.value as UemoaCountryCode;
                setCountryCode(code);
                const found = UEMOA_COUNTRIES.find((c) => c.code === code);
                if (found) {
                  setCity(found.majorCities[0] ?? "");
                  setPhone(`${found.dialCode} `);
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              {UEMOA_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reg-city" className="block text-sm font-semibold text-slate-800">
              Ville *
            </label>
            <input
              id="reg-city"
              name="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="reg-password" className="block text-sm font-semibold text-slate-800">
              Mot de passe (8 caractères minimum) *
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-start gap-2.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-teal-600"
              />
              <span>
                J&apos;accepte les{" "}
                <Link href="/cgu" className="font-semibold text-teal-700 underline">
                  CGU
                </Link>{" "}
                et les{" "}
                <Link href="/cgvps" className="font-semibold text-teal-700 underline">
                  Conditions Organisateurs (CGVPS)
                </Link>
                .
              </span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Créer mon Espace Organisateur
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-bold text-teal-700 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

