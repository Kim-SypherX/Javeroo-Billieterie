"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, PlusCircle, X } from "lucide-react";
import type { FeeBearer } from "@/config/pricing";
import { EVENT_CATEGORIES, type EventCategoryId } from "@/config/site";
import { UEMOA_COUNTRIES, type UemoaCountryCode } from "@/config/uemoa";

export function OrganizerEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategoryId>("concert");
  const [countryCode, setCountryCode] = useState<UemoaCountryCode>("BF");
  const [city, setCity] = useState("Ouagadougou");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [startsAt, setStartsAt] = useState("2026-12-20T19:00");
  const [endsAt, setEndsAt] = useState("2026-12-20T23:30");
  const [feeBearer, setFeeBearer] = useState<FeeBearer>("ORGANIZER");
  const [tierName, setTierName] = useState("Pass Normal");
  const [tierPriceXof, setTierPriceXof] = useState(5000);
  const [tierTotalQty, setTierTotalQty] = useState(200);
  const [promoCode, setPromoCode] = useState("");
  const [promoPercent, setPromoPercent] = useState(10);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePosterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPoster(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/poster", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de téléverser l'affiche.");
      } else {
        setCoverImageUrl(data.imageUrl);
      }
    } catch {
      setError("Erreur réseau lors de l'envoi de l'affiche.");
    } finally {
      setUploadingPoster(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortSummary,
          description,
          category,
          countryCode,
          city,
          venueName,
          venueAddress,
          startsAt,
          endsAt,
          feeBearer,
          coverImageUrl,
          tierName,
          tierPriceXof: Number(tierPriceXof),
          tierTotalQty: Number(tierTotalQty),
          promoCode: promoCode.trim() || undefined,
          promoPercent: promoCode.trim() ? Number(promoPercent) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de créer l'événement.");
        setSubmitting(false);
        return;
      }

      router.push(`/evenements/${data.event.slug}`);
      router.refresh();
    } catch {
      setError("Erreur réseau lors de la publication.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-[#1B2A4A]">
          Publier un nouvel événement
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Créez votre événement en quelques champs : il apparaît immédiatement dans le catalogue
          avec achat Mobile Money et QR codes sécurisés.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="evt-title" className="block text-sm font-semibold text-slate-800">
            Titre de l&apos;événement *
          </label>
          <input
            id="evt-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Concert Acoustique de Fin d'Année"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-summary" className="block text-sm font-semibold text-slate-800">
            Phrase d&apos;accroche courte *
          </label>
          <input
            id="evt-summary"
            name="shortSummary"
            type="text"
            required
            value={shortSummary}
            onChange={(e) => setShortSummary(e.target.value)}
            placeholder="Un résumé clair en une phrase affiché sur Google et WhatsApp."
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="evt-category" className="block text-sm font-semibold text-slate-800">
            Catégorie *
          </label>
          <select
            id="evt-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategoryId)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
          >
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="evt-country" className="block text-sm font-semibold text-slate-800">
            Pays (Zone UEMOA — FCFA) *
          </label>
          <select
            id="evt-country"
            name="countryCode"
            value={countryCode}
            onChange={(e) => {
              const code = e.target.value as UemoaCountryCode;
              setCountryCode(code);
              const found = UEMOA_COUNTRIES.find((c) => c.code === code);
              if (found?.majorCities[0]) setCity(found.majorCities[0]);
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
          <label htmlFor="evt-city" className="block text-sm font-semibold text-slate-800">
            Ville *
          </label>
          <input
            id="evt-city"
            name="city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="evt-venue" className="block text-sm font-semibold text-slate-800">
            Nom de la salle / lieu *
          </label>
          <input
            id="evt-venue"
            name="venueName"
            type="text"
            required
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Ex. CENASA / Palais de la Culture"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-address" className="block text-sm font-semibold text-slate-800">
            Adresse précise (quartier / avenue) *
          </label>
          <input
            id="evt-address"
            name="venueAddress"
            type="text"
            required
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            placeholder="Ex. Avenue Kwamé N'Krumah, Centre-ville"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="evt-starts" className="block text-sm font-semibold text-slate-800">
            Début *
          </label>
          <input
            id="evt-starts"
            name="startsAt"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="evt-ends" className="block text-sm font-semibold text-slate-800">
            Fin *
          </label>
          <input
            id="evt-ends"
            name="endsAt"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-poster-upload" className="block text-sm font-semibold text-slate-800">
            Affiche officielle (JPEG, PNG, WebP ou AVIF — max 5 Mo, optionnelle)
          </label>
          <div className="mt-1.5 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <label
              htmlFor="evt-poster-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#1B2A4A] shadow-2xs ring-1 ring-slate-300 hover:bg-teal-50 hover:text-teal-700"
            >
              {uploadingPoster ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-4 w-4 text-teal-600" aria-hidden="true" />
              )}
              {uploadingPoster ? "Téléversement..." : "Choisir une affiche"}
            </label>
            <input
              id="evt-poster-upload"
              name="posterFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => void handlePosterFileChange(e)}
              className="sr-only"
            />
            {coverImageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="Aperçu de l'affiche téléversée"
                  className="h-14 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl(undefined)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Retirer
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500">
                Si vide, une affiche vectorielle propre est générée automatiquement.
              </span>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-desc" className="block text-sm font-semibold text-slate-800">
            Description détaillée *
          </label>
          <textarea
            id="evt-desc"
            name="description"
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Programme, artistes invités, ouverture des portes, consignes..."
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* Billetterie & Commission */}
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="tier-name" className="block text-xs font-bold text-slate-700 uppercase">
            Nom du billet *
          </label>
          <input
            id="tier-name"
            name="tierName"
            type="text"
            required
            value={tierName}
            onChange={(e) => setTierName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="tier-price" className="block text-xs font-bold text-slate-700 uppercase">
            Prix (FCFA, 0 = gratuit) *
          </label>
          <input
            id="tier-price"
            name="tierPriceXof"
            type="number"
            min={0}
            step={500}
            required
            value={tierPriceXof}
            onChange={(e) => setTierPriceXof(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="tier-qty" className="block text-xs font-bold text-slate-700 uppercase">
            Nombre de places *
          </label>
          <input
            id="tier-qty"
            name="tierTotalQty"
            type="number"
            min={1}
            required
            value={tierTotalQty}
            onChange={(e) => setTierTotalQty(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-fee-bearer" className="block text-xs font-bold text-slate-700 uppercase">
            Commission Javeroo (8 % sur payant)
          </label>
          <select
            id="evt-fee-bearer"
            name="feeBearer"
            value={feeBearer}
            onChange={(e) => setFeeBearer(e.target.value as FeeBearer)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ORGANIZER">Incluse dans le prix affiché (supportée par l&apos;organisateur)</option>
            <option value="BUYER">Ajoutée au billet (affichée à l&apos;acheteur avant paiement)</option>
          </select>
        </div>

        <div>
          <label htmlFor="evt-promo" className="block text-xs font-bold text-slate-700 uppercase">
            Code promo optionnel (%)
          </label>
          <div className="mt-1 flex gap-1.5">
            <input
              id="evt-promo"
              name="promoCode"
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="PROMO10"
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs uppercase"
            />
            <input
              aria-label="Pourcentage de remise"
              name="promoPercent"
              type="number"
              min={5}
              max={90}
              value={promoPercent}
              onChange={(e) => setPromoPercent(Number(e.target.value))}
              className="w-16 rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
        )}
        Publier l&apos;événement dans le catalogue
      </button>
    </form>
  );
}

