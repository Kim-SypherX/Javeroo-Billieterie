"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  PlusCircle,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { EVENT_CATEGORIES, type EventCategoryId } from "@/config/site";
import { UEMOA_COUNTRIES, type UemoaCountryCode } from "@/config/uemoa";
import {
  optimizePosterFileForUpload,
  saveCachedEventPoster,
} from "@/modules/media/client-poster";

interface TierDraft {
  id: string;
  name: string;
  description: string;
  priceXof: number;
  totalQty: number;
}

const TIER_PRESETS: Array<{ name: string; priceXof: number; totalQty: number; description: string }> = [
  { name: "Prévente Early Bird", priceXof: 3000, totalQty: 100, description: "Tarif réduit en quantité limitée." },
  { name: "Pass VIP", priceXof: 15000, totalQty: 80, description: "Accès coupe-file + espace VIP réservé." },
  { name: "Pass Or", priceXof: 25000, totalQty: 40, description: "Premiers rangs + boisson et accueil privilégié." },
  { name: "Table (5 personnes)", priceXof: 100000, totalQty: 15, description: "Table réservée pour 5 invités." },
];

interface DelegatedOrganizerOption {
  id: string;
  name: string;
  city: string;
  countryCode: string;
}

interface OrganizerEventFormProps {
  delegatedOrganizers?: DelegatedOrganizerOption[];
  selectedOrganizationId?: string;
}

export function OrganizerEventForm({
  delegatedOrganizers,
  selectedOrganizationId,
}: OrganizerEventFormProps = {}) {
  const router = useRouter();
  const isDelegatedMode = Boolean(delegatedOrganizers && delegatedOrganizers.length > 0);
  const [targetOrganizationId, setTargetOrganizationId] = useState<string>(
    selectedOrganizationId || delegatedOrganizers?.[0]?.id || "__new__",
  );

  useEffect(() => {
    if (selectedOrganizationId) {
      setTargetOrganizationId(selectedOrganizationId);
    }
  }, [selectedOrganizationId]);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EventCategoryId>("concert");
  const [countryCode, setCountryCode] = useState<UemoaCountryCode>("BF");
  const [city, setCity] = useState("Ouagadougou");

  // Lieu : double approche (repères textuels clairs + géolocalisation GPS / lien Maps)
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [locationHint, setLocationHint] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [locating, setLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const [startsAt, setStartsAt] = useState("2026-12-20T19:00");
  const [endsAt, setEndsAt] = useState("2026-12-20T23:30");

  // Multi-catégories de billets (Pass Normal, Pass VIP, Pass Or...)
  const [tiers, setTiers] = useState<TierDraft[]>([
    {
      id: "tier-1",
      name: "Pass Normal",
      description: "Accès standard à l'événement.",
      priceXof: 5000,
      totalQty: 200,
    },
  ]);

  const [promoCode, setPromoCode] = useState("");
  const [promoPercent, setPromoPercent] = useState(10);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTier(preset?: (typeof TIER_PRESETS)[number]) {
    if (tiers.length >= 10) return;
    setTiers((prev) => [
      ...prev,
      {
        id: `tier-${Date.now()}-${prev.length}`,
        name: preset?.name ?? `Pass Catégorie ${prev.length + 1}`,
        description: preset?.description ?? "",
        priceXof: preset?.priceXof ?? 10000,
        totalQty: preset?.totalQty ?? 100,
      },
    ]);
  }

  function updateTier(id: string, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function removeTier(id: string) {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((t) => t.id !== id));
  }

  function handleDetectGps() {
    setGeoStatus(null);
    if (!navigator.geolocation) {
      setGeoStatus("La géolocalisation n'est pas disponible sur cet appareil. Collez un lien Google Maps.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setMapsUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        setGeoStatus(`Position GPS enregistrée (${lat}, ${lng}).`);
        setLocating(false);
      },
      () => {
        setGeoStatus("Autorisation GPS refusée. Vous pouvez coller un lien Google Maps ci-dessous.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handlePosterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    setUploadingPoster(true);
    setError(null);
    try {
      // Optimise automatiquement les PNG/JPG haute résolution (Photoshop, Canva...) avant envoi
      const optimizedFile = await optimizePosterFileForUpload(rawFile);
      const formData = new FormData();
      formData.append("file", optimizedFile);
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
      e.target.value = "";
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
          locationHint: locationHint.trim() || undefined,
          latitude,
          longitude,
          mapsUrl: mapsUrl.trim() || undefined,
          startsAt,
          endsAt,
          coverImageUrl,
          tiers: tiers.map((t) => ({
            name: t.name,
            description: t.description.trim() || undefined,
            priceXof: Number(t.priceXof),
            totalQty: Number(t.totalQty),
          })),
          promoCode: promoCode.trim() || undefined,
          promoPercent: promoCode.trim() ? Number(promoPercent) : undefined,
          ...(isDelegatedMode
            ? targetOrganizationId === "__new__"
              ? {
                  newOrganizer: {
                    name: newOrgName.trim(),
                    supportPhone: newOrgPhone.trim() || undefined,
                    supportEmail: newOrgEmail.trim() || undefined,
                  },
                }
              : { targetOrganizationId }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Impossible de créer l'événement.");
        setSubmitting(false);
        return;
      }

      if (coverImageUrl && data.event?.id && data.event?.slug) {
        saveCachedEventPoster(data.event.id, data.event.slug, coverImageUrl);
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
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-[#1B2A4A]">
          {isDelegatedMode
            ? "Publier un événement au nom d'un promoteur"
            : "Publier un nouvel événement"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {isDelegatedMode
            ? "Mode Équipe Javeroo (conciergerie) : sélectionnez le promoteur partenaire ou créez son profil ci-dessous. L'action est tracée dans le journal d'audit."
            : "Décrivez votre lieu clairement, ajoutez la localisation GPS pour Google Maps et créez autant de catégories de billets que souhaité (Pass Normal, VIP, Or...)."}
        </p>
      </div>

      {isDelegatedMode && delegatedOrganizers && (
        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
          <div>
            <label
              htmlFor="delegated-org-select"
              className="block text-xs font-bold tracking-wider text-indigo-900 uppercase"
            >
              Promoteur propriétaire de l&apos;événement *
            </label>
            <select
              id="delegated-org-select"
              value={targetOrganizationId}
              onChange={(e) => setTargetOrganizationId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1B2A4A]"
            >
              {delegatedOrganizers.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.city} · {org.countryCode})
                </option>
              ))}
              <option value="__new__">+ Créer un nouveau promoteur partenaire</option>
            </select>
          </div>

          {targetOrganizationId === "__new__" && (
            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              <div>
                <label htmlFor="new-org-name" className="block text-xs font-semibold text-slate-700">
                  Nom du promoteur *
                </label>
                <input
                  id="new-org-name"
                  type="text"
                  required
                  minLength={2}
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Ex. Bobo Live Prod"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-org-phone" className="block text-xs font-semibold text-slate-700">
                  WhatsApp / Tél. support
                </label>
                <input
                  id="new-org-phone"
                  type="tel"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  placeholder="+226 70 00 00 00"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-org-email" className="block text-xs font-semibold text-slate-700">
                  E-mail (optionnel)
                </label>
                <input
                  id="new-org-email"
                  type="email"
                  value={newOrgEmail}
                  onChange={(e) => setNewOrgEmail(e.target.value)}
                  placeholder="contact@promoteur.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {/* 1. Informations générales */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="evt-title" className="block text-sm font-semibold text-slate-800">
            Titre de l&apos;événement *
          </label>
          <input
            id="evt-title"
            name="title"
            type="text"
            minLength={4}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Concert Acoustique de Fin d'Année"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="evt-summary" className="block text-sm font-semibold text-slate-800">
            Phrase d&apos;accroche courte *{" "}
            <span className="text-xs font-normal text-slate-500">(min. 10 caractères)</span>
          </label>
          <input
            id="evt-summary"
            name="shortSummary"
            type="text"
            minLength={10}
            required
            value={shortSummary}
            onChange={(e) => setShortSummary(e.target.value)}
            placeholder="Un résumé clair en une phrase affiché sur WhatsApp et Google."
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
          <label htmlFor="evt-starts" className="block text-sm font-semibold text-slate-800">
            Date &amp; heure de début *
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
            Date &amp; heure de fin *
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
      </div>

      {/* 2. Lieu : Indications textuelles + Géolocalisation GPS / Google Maps */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#1B2A4A]">
            <MapPin className="h-4 w-4 text-teal-600" aria-hidden="true" />
            Lieu &amp; Localisation (Texte simple + GPS Google Maps)
          </p>
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-600 disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5 text-teal-300" aria-hidden="true" />
            )}
            Utiliser ma position GPS
          </button>
        </div>

        {geoStatus && (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">
            {geoStatus}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="evt-city" className="block text-xs font-bold text-slate-700 uppercase">
              Ville *
            </label>
            <input
              id="evt-city"
              name="city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="evt-venue" className="block text-xs font-bold text-slate-700 uppercase">
              Nom de la salle / lieu *
            </label>
            <input
              id="evt-venue"
              name="venueName"
              type="text"
              required
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Ex. Palais des Sports / Ciné Neerwaya"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="evt-address"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Quartier / Avenue *
            </label>
            <input
              id="evt-address"
              name="venueAddress"
              type="text"
              required
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Ex. Avenue Kwamé N'Krumah, Centre-ville"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="evt-hint" className="block text-xs font-bold text-slate-700 uppercase">
              Repères simples pour s&apos;y rendre (pour ceux qui n&apos;utilisent pas Maps)
            </label>
            <input
              id="evt-hint"
              name="locationHint"
              type="text"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="Ex. Juste en face de la grande station Total, 200 m après le rond-point"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="evt-maps-url"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Lien Google Maps (optionnel — ou cliquez sur « Utiliser ma position GPS »)
            </label>
            <input
              id="evt-maps-url"
              name="mapsUrl"
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/... ou https://www.google.com/maps/..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Affiche & Description */}
      <div className="space-y-4">
        <div>
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

        <div>
          <label htmlFor="evt-desc" className="block text-sm font-semibold text-slate-800">
            Description détaillée *{" "}
            <span className="text-xs font-normal text-slate-500">(min. 15 caractères)</span>
          </label>
          <textarea
            id="evt-desc"
            name="description"
            rows={3}
            minLength={15}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Programme, artistes invités, ouverture des portes, consignes..."
            className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* 4. Multi-catégories de billets (Pass Normal, Pass VIP, Pass Or...) */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#1B2A4A]">
              Catégories de billets ({tiers.length}/10)
            </p>
            <p className="text-xs text-slate-600">
              Ajoutez plusieurs formules (Pass Normal, Pass VIP, Pass Or, Prévente, Table...).
            </p>
          </div>
          <button
            type="button"
            disabled={tiers.length >= 10}
            onClick={() => addTier()}
            className="inline-flex items-center gap-1 rounded-xl bg-[#1B2A4A] px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Ajouter une catégorie
          </button>
        </div>

        {/* Raccourcis 1 clic */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">Ajout rapide :</span>
          {TIER_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={tiers.length >= 10}
              onClick={() => addTier(preset)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-40"
            >
              + {preset.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tiers.map((tier, idx) => (
            <div
              key={tier.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 uppercase">
                  Catégorie #{idx + 1}
                </span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(tier.id)}
                    aria-label={`Supprimer la catégorie ${tier.name}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Supprimer
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor={`tier-name-${tier.id}`}
                    className="block text-[11px] font-bold text-slate-600 uppercase"
                  >
                    Nom du billet *
                  </label>
                  <input
                    id={`tier-name-${tier.id}`}
                    type="text"
                    required
                    value={tier.name}
                    onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                    placeholder="Ex. Pass VIP"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`tier-price-${tier.id}`}
                    className="block text-[11px] font-bold text-slate-600 uppercase"
                  >
                    Prix (FCFA, 0 = gratuit) *
                  </label>
                  <input
                    id={`tier-price-${tier.id}`}
                    type="number"
                    min={0}
                    step={500}
                    required
                    value={tier.priceXof}
                    onChange={(e) => updateTier(tier.id, { priceXof: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`tier-qty-${tier.id}`}
                    className="block text-[11px] font-bold text-slate-600 uppercase"
                  >
                    Nombre de places *
                  </label>
                  <input
                    id={`tier-qty-${tier.id}`}
                    type="number"
                    min={1}
                    required
                    value={tier.totalQty}
                    onChange={(e) => updateTier(tier.id, { totalQty: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label
                    htmlFor={`tier-desc-${tier.id}`}
                    className="block text-[11px] font-bold text-slate-600 uppercase"
                  >
                    Avantages inclus (optionnel)
                  </label>
                  <input
                    id={`tier-desc-${tier.id}`}
                    type="text"
                    value={tier.description}
                    onChange={(e) => updateTier(tier.id, { description: e.target.value })}
                    placeholder="Ex. Entrée coupe-file + place assise + 1 boisson"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Règle unique de commission (toujours prélevée côté organisateur) + Code promo */}
        <div className="grid gap-3 border-t border-slate-200 pt-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-950 sm:col-span-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            <div>
              <p className="font-bold">
                Commission Javeroo : {PRICING_CONFIG.standardCommissionPercent} % prélevés sur vos
                ventes payantes (0 % sur gratuit)
              </p>
              <p className="mt-0.5 text-[11px] text-teal-900">
                Le spectateur paie exactement le prix affiché (0 FCFA de frais ajoutés). Votre net
                est calculé automatiquement dans votre portefeuille.
              </p>
            </div>
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
      </div>

      <button
        type="submit"
        disabled={submitting || uploadingPoster}
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
