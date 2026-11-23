"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  Plus,
  PlusCircle,
  Share2,
  ShieldCheck,
  Trash2,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import { PRICING_CONFIG } from "@/config/pricing";
import { formatXof, UEMOA_COUNTRIES, type UemoaCountryCode } from "@/config/uemoa";
import {
  optimizePosterFileForUpload,
  saveCachedEventPoster,
} from "@/modules/media/client-poster";
import {
  getCampaignCommissionXof,
  getCampaignGrossXof,
  getCampaignTotalVotes,
  VOTE_CATEGORIES,
  type VoteCampaignStatus,
  type VoteCampaignView,
  type VoteCategoryId,
} from "@/modules/votes/types";

interface CandidateDraft {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  bio: string;
  photoUrl?: string;
}

interface DelegatedOrganizerOption {
  id: string;
  name: string;
  city: string;
  countryCode: string;
}

interface OrganizerVoteManagerProps {
  initialCampaigns: VoteCampaignView[];
  delegatedOrganizers?: DelegatedOrganizerOption[];
  isAdmin?: boolean;
}

export function OrganizerVoteManager({
  initialCampaigns,
  delegatedOrganizers,
  isAdmin = false,
}: OrganizerVoteManagerProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<VoteCampaignView[]>(initialCampaigns);
  const isDelegated = Boolean(delegatedOrganizers && delegatedOrganizers.length > 0);

  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  // Formulaire de création d'une campagne de vote
  const [targetOrgId, setTargetOrgId] = useState<string>(delegatedOrganizers?.[0]?.id ?? "__new__");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");

  const [title, setTitle] = useState("");
  const [shortSummary, setShortSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VoteCategoryId>("miss");
  const [countryCode, setCountryCode] = useState<UemoaCountryCode>("BF");
  const [city, setCity] = useState("Ouagadougou");
  const [startsAt, setStartsAt] = useState("2026-11-24T08:00");
  const [endsAt, setEndsAt] = useState("2026-12-30T23:59");
  const [unitVotePriceXof, setUnitVotePriceXof] = useState(200);
  const [showLiveResults, setShowLiveResults] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    { id: "c-1", code: "C01", name: "", subtitle: "", bio: "" },
    { id: "c-2", code: "C02", name: "", subtitle: "", bio: "" },
  ]);
  const [uploadingCandId, setUploadingCandId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string; slug?: string } | null>(null);

  // Ajout rapide de candidat sur une campagne existante
  const [addingToCampaignId, setAddingToCampaignId] = useState<string | null>(null);
  const [quickCandName, setQuickCandName] = useState("");
  const [quickCandSubtitle, setQuickCandSubtitle] = useState("");
  const [quickCandBusy, setQuickCandBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function addCandidateDraft() {
    if (candidates.length >= 30) return;
    const nextNum = candidates.length + 1;
    setCandidates((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}-${nextNum}`,
        code: `C${String(nextNum).padStart(2, "0")}`,
        name: "",
        subtitle: "",
        bio: "",
      },
    ]);
  }

  function updateCandidateDraft(id: string, patch: Partial<CandidateDraft>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCandidateDraft(id: string) {
    if (candidates.length <= 2) return;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  async function uploadImageOptimized(rawFile: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    const optimized = await optimizePosterFileForUpload(rawFile);
    const fd = new FormData();
    fd.append("file", optimized);
    const res = await fetch("/api/uploads/poster", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error ?? "Impossible de téléverser l'image." };
    }
    return { ok: true, url: data.imageUrl as string };
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setFormMsg(null);
    try {
      const res = await uploadImageOptimized(file);
      if (res.ok) setCoverImageUrl(res.url);
      else setFormMsg({ ok: false, text: res.error });
    } catch {
      setFormMsg({ ok: false, text: "Erreur réseau lors de l'envoi de l'affiche." });
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleCandidatePhotoUpload(candId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCandId(candId);
    setFormMsg(null);
    try {
      const res = await uploadImageOptimized(file);
      if (res.ok) updateCandidateDraft(candId, { photoUrl: res.url });
      else setFormMsg({ ok: false, text: res.error });
    } catch {
      setFormMsg({ ok: false, text: "Erreur réseau lors de l'envoi de la photo." });
    } finally {
      setUploadingCandId(null);
      e.target.value = "";
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    const validCandidates = candidates.filter((c) => c.name.trim().length >= 2);
    if (validCandidates.length < 2) {
      setFormMsg({ ok: false, text: "Renseignez au moins 2 candidats avec leur nom complet." });
      return;
    }

    setSubmitting(true);
    setFormMsg(null);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortSummary,
          description,
          category,
          countryCode,
          city,
          startsAt,
          endsAt,
          unitVotePriceXof: Number(unitVotePriceXof),
          showLiveResults,
          coverImageUrl,
          candidates: validCandidates.map((c) => ({
            code: c.code.trim() || undefined,
            name: c.name.trim(),
            subtitle: c.subtitle.trim() || undefined,
            bio: c.bio.trim() || undefined,
            photoUrl: c.photoUrl,
          })),
          ...(isDelegated
            ? targetOrgId === "__new__"
              ? {
                  newOrganizer: {
                    name: newOrgName.trim(),
                    supportPhone: newOrgPhone.trim() || undefined,
                  },
                }
              : { targetOrganizationId: targetOrgId }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFormMsg({ ok: false, text: data.error ?? "Impossible de créer la campagne de vote." });
        return;
      }

      const created = data.campaign as VoteCampaignView;
      // Cache local de l'affiche et des portraits pour affichage immédiat sans Vercel Blob
      if (coverImageUrl) {
        saveCachedEventPoster(created.id, created.slug, coverImageUrl);
      }
      created.candidates.forEach((cand, idx) => {
        const draftPhoto = validCandidates[idx]?.photoUrl;
        if (draftPhoto) {
          saveCachedEventPoster(cand.id, `${created.slug}-${cand.code}`, draftPhoto);
        }
      });

      setCampaigns((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setTitle("");
      setShortSummary("");
      setDescription("");
      setCoverImageUrl(undefined);
      setCandidates([
        { id: "c-new-1", code: "C01", name: "", subtitle: "", bio: "" },
        { id: "c-new-2", code: "C02", name: "", subtitle: "", bio: "" },
      ]);
      setFormMsg({
        ok: true,
        text: `Concours « ${created.title} » publié avec ${created.candidates.length} candidats !`,
        slug: created.slug,
      });
      router.refresh();
    } catch {
      setFormMsg({ ok: false, text: "Erreur réseau lors de la création." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePatchCampaign(
    campaignId: string,
    patch: { status?: VoteCampaignStatus; showLiveResults?: boolean; isFeatured?: boolean },
  ) {
    setActionBusyId(campaignId);
    try {
      const res = await fetch(`/api/votes/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.campaign) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? (data.campaign as VoteCampaignView) : c)),
        );
        router.refresh();
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDeleteCampaign(campaignId: string) {
    setActionBusyId(campaignId);
    try {
      const res = await fetch(`/api/votes/${campaignId}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        router.refresh();
      }
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleQuickAddCandidate(campaignId: string, e: React.FormEvent) {
    e.preventDefault();
    if (quickCandName.trim().length < 2) return;
    setQuickCandBusy(true);
    try {
      const res = await fetch(`/api/votes/${campaignId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickCandName.trim(),
          subtitle: quickCandSubtitle.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.campaign) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? (data.campaign as VoteCampaignView) : c)),
        );
        setQuickCandName("");
        setQuickCandSubtitle("");
        setAddingToCampaignId(null);
        router.refresh();
      }
    } finally {
      setQuickCandBusy(false);
    }
  }

  function copyCandidateDirectLink(slug: string, code: string) {
    const url = `${window.location.origin}/votes/${slug}?candidat=${encodeURIComponent(code)}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url);
    }
    const key = `${slug}:${code}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 2200);
  }

  return (
    <div className="space-y-8">
      {/* Liste des campagnes de vote existantes */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#1B2A4A]">
              <Trophy className="h-5 w-5 text-teal-600" aria-hidden="true" />
              {isAdmin ? "Toutes les campagnes de vote" : "Vos campagnes de vote"} ({campaigns.length})
            </h2>
            <p className="text-xs text-slate-600">
              Suivez les voix en temps réel, gérez l&apos;ouverture des votes et partagez les liens
              directs de chaque candidat.
            </p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs text-slate-600">
            Aucune campagne de vote publiée pour le moment. Utilisez le formulaire ci-dessous pour
            lancer votre premier concours (Miss, Awards, Musique, Tournoi...) avec paiement Mobile
            Money intégré.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {campaigns.map((camp) => {
              const totalVotes = getCampaignTotalVotes(camp);
              const grossXof = getCampaignGrossXof(camp);
              const commXof = getCampaignCommissionXof(camp);
              const netXof = Math.max(0, grossXof - commXof);
              const busy = actionBusyId === camp.id;

              return (
                <div
                  key={camp.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            camp.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800"
                              : camp.status === "PAUSED"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {camp.status === "OPEN"
                            ? "Ouvert"
                            : camp.status === "PAUSED"
                              ? "En pause"
                              : "Clôturé"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {camp.city} ({camp.countryCode}) ·{" "}
                          {camp.unitVotePriceXof === 0
                            ? "Gratuit"
                            : `${formatXof(camp.unitVotePriceXof)} / voix`}
                          {isAdmin && ` · ${camp.organizer.name}`}
                        </span>
                      </div>
                      <Link
                        href={`/votes/${camp.slug}`}
                        className="mt-1 inline-flex items-center gap-1 font-display text-base font-bold text-[#1B2A4A] hover:text-teal-700"
                      >
                        {camp.title}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <span className="font-bold text-[#1B2A4A]">
                          {totalVotes.toLocaleString("fr-FR")} voix
                        </span>
                        <span className="text-slate-600">
                          Brut : <strong>{formatXof(grossXof)}</strong>
                        </span>
                        <span className="text-indigo-700">
                          Comm. 8 % : <strong>{formatXof(commXof)}</strong>
                        </span>
                        <span className="font-bold text-teal-700">
                          Net promoteur : {formatXof(netXof)}
                        </span>
                      </div>
                    </div>

                    {/* Contrôles campagne */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {camp.status !== "OPEN" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePatchCampaign(camp.id, { status: "OPEN" })}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          <Play className="h-3 w-3" aria-hidden="true" />
                          Ouvrir
                        </button>
                      )}
                      {camp.status === "OPEN" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePatchCampaign(camp.id, { status: "PAUSED" })}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                        >
                          <Pause className="h-3 w-3" aria-hidden="true" />
                          Pause
                        </button>
                      )}
                      {camp.status !== "CLOSED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePatchCampaign(camp.id, { status: "CLOSED" })}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Clôturer
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void handlePatchCampaign(camp.id, {
                            showLiveResults: !camp.showLiveResults,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {camp.showLiveResults ? (
                          <>
                            <Eye className="h-3 w-3 text-teal-600" aria-hidden="true" />
                            Scores visibles
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 text-slate-500" aria-hidden="true" />
                            Scores masqués
                          </>
                        )}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handlePatchCampaign(camp.id, { isFeatured: !camp.isFeatured })
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                            camp.isFeatured
                              ? "bg-amber-100 text-amber-900"
                              : "border border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {camp.isFeatured ? "★ Une" : "☆ Une"}
                        </button>
                      )}
                      <a
                        href={`/api/votes/${camp.id}/export`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1B2A4A] hover:bg-teal-50 hover:text-teal-700"
                      >
                        <Download className="h-3 w-3" aria-hidden="true" />
                        CSV
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setAddingToCampaignId(addingToCampaignId === camp.id ? null : camp.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-100"
                      >
                        <UserPlus className="h-3 w-3" aria-hidden="true" />+ Candidat
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeleteCampaign(camp.id)}
                        aria-label={`Supprimer ${camp.title}`}
                        className="rounded-lg border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Ajout rapide d'un candidat */}
                  {addingToCampaignId === camp.id && (
                    <form
                      onSubmit={(e) => void handleQuickAddCandidate(camp.id, e)}
                      className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-indigo-200 bg-white p-3"
                    >
                      <div className="min-w-[160px] flex-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Nom du candidat *
                        </label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          value={quickCandName}
                          onChange={(e) => setQuickCandName(e.target.value)}
                          placeholder="Ex. Fatou Diallo"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div className="min-w-[160px] flex-1">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Région / Catégorie
                        </label>
                        <input
                          type="text"
                          value={quickCandSubtitle}
                          onChange={(e) => setQuickCandSubtitle(e.target.value)}
                          placeholder="Ex. Bobo-Dioulasso"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={quickCandBusy}
                        className="rounded-lg bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-600"
                      >
                        {quickCandBusy ? "Ajout..." : "Ajouter"}
                      </button>
                    </form>
                  )}

                  {/* Liste compacte des candidats + lien direct WhatsApp */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {camp.candidates.map((cand) => {
                      const cKey = `${camp.slug}:${cand.code}`;
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => copyCandidateDirectLink(camp.slug, cand.code)}
                          title="Cliquer pour copier le lien de vote direct de ce candidat"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 hover:border-teal-300 hover:bg-teal-50"
                        >
                          <span className="font-mono font-bold text-teal-700">{cand.code}</span>
                          <span className="font-semibold text-[#1B2A4A]">{cand.name}</span>
                          <span className="text-slate-500">({cand.votesCount} voix)</span>
                          {copiedKey === cKey ? (
                            <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          ) : (
                            <Share2 className="h-3 w-3 text-slate-400" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Formulaire de création d'un nouveau concours de vote */}
      <form
        onSubmit={handleCreateCampaign}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      >
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#1B2A4A]">
            <PlusCircle className="h-5 w-5 text-teal-600" aria-hidden="true" />
            {isDelegated
              ? "Créer un concours de vote au nom d'un promoteur"
              : "Créer un nouveau concours de vote payant"}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Configurez votre concours (Miss, Awards, Musique, Créateurs...), ajoutez vos candidats
            avec leurs photos PNG/JPG et encaissez les votes en direct par Mobile Money.
          </p>
        </div>

        {formMsg && (
          <div
            role="alert"
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
              formMsg.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{formMsg.text}</span>
            {formMsg.slug && (
              <Link
                href={`/votes/${formMsg.slug}`}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Ouvrir la page de vote
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        {isDelegated && delegatedOrganizers && (
          <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
            <label className="block text-xs font-bold text-indigo-900 uppercase">
              Promoteur propriétaire du concours *
            </label>
            <select
              value={targetOrgId}
              onChange={(e) => setTargetOrgId(e.target.value)}
              className="w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#1B2A4A]"
            >
              {delegatedOrganizers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.city} · {o.countryCode})
                </option>
              ))}
              <option value="__new__">+ Créer un nouveau promoteur partenaire</option>
            </select>
            {targetOrgId === "__new__" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Nom du promoteur *"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={newOrgPhone}
                  onChange={(e) => setNewOrgPhone(e.target.value)}
                  placeholder="WhatsApp support (+226...)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="vote-title" className="block text-sm font-semibold text-slate-800">
              Titre du concours / Awards *
            </label>
            <input
              id="vote-title"
              type="text"
              required
              minLength={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Miss Campus Ouagadougou 2026 ou Meilleur Artiste Faso"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="vote-summary" className="block text-sm font-semibold text-slate-800">
              Phrase d&apos;accroche *
            </label>
            <input
              id="vote-summary"
              type="text"
              required
              minLength={10}
              value={shortSummary}
              onChange={(e) => setShortSummary(e.target.value)}
              placeholder="Ex. Soutenez votre candidat favori par Orange Money ou Wave (200 FCFA / voix)."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="vote-cat-input" className="block text-sm font-semibold text-slate-800">
              Catégorie *
            </label>
            <select
              id="vote-cat-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as VoteCategoryId)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              {VOTE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vote-country-input" className="block text-sm font-semibold text-slate-800">
              Pays UEMOA *
            </label>
            <select
              id="vote-country-input"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value as UemoaCountryCode)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              {UEMOA_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vote-city-input" className="block text-sm font-semibold text-slate-800">
              Ville *
            </label>
            <input
              id="vote-city-input"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="vote-price-input" className="block text-sm font-semibold text-slate-800">
              Prix d&apos;1 vote (FCFA) *
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="vote-price-input"
                type="number"
                min={0}
                step={50}
                required
                value={unitVotePriceXof}
                onChange={(e) => setUnitVotePriceXof(Number(e.target.value))}
                className="w-32 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold"
              />
              {[100, 200, 500].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUnitVotePriceXof(p)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-bold ${
                    unitVotePriceXof === p
                      ? "bg-[#1B2A4A] text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {p} F
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="vote-start" className="block text-sm font-semibold text-slate-800">
              Ouverture des votes *
            </label>
            <input
              id="vote-start"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="vote-end" className="block text-sm font-semibold text-slate-800">
              Clôture des votes *
            </label>
            <input
              id="vote-end"
              type="datetime-local"
              required
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          {/* Affiche bannière (PNG / JPG auto-optimisé) */}
          <div className="sm:col-span-2">
            <span className="block text-sm font-semibold text-slate-800">
              Affiche / Bannière du concours (PNG, JPG, WebP — optimisée automatiquement)
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#1B2A4A] hover:bg-slate-100">
                {uploadingCover ? (
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-teal-600" aria-hidden="true" />
                )}
                {uploadingCover ? "Optimisation..." : "Importer une affiche"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  onChange={handleCoverUpload}
                  className="sr-only"
                />
              </label>
              {coverImageUrl && (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt="Aperçu affiche concours"
                    className="h-12 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl(undefined)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Retirer
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="vote-desc" className="block text-sm font-semibold text-slate-800">
              Règlement &amp; Description *
            </label>
            <textarea
              id="vote-desc"
              rows={3}
              required
              minLength={15}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expliquez le poids des votes du public, la date de remise des trophées et les règles."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showLiveResults}
                onChange={(e) => setShowLiveResults(e.target.checked)}
                className="h-4 w-4 accent-teal-600"
              />
              Afficher le classement et les pourcentages en temps réel au public (modifiable à tout
              moment)
            </label>
          </div>
        </div>

        {/* Builder multi-candidats */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-[#1B2A4A]">
                Candidats du concours ({candidates.length})
              </h3>
              <p className="text-xs text-slate-600">
                Ajoutez vos candidats (minimum 2). Vous pourrez aussi en ajouter d&apos;autres après
                publication.
              </p>
            </div>
            <button
              type="button"
              onClick={addCandidateDraft}
              className="inline-flex items-center gap-1 rounded-xl bg-[#1B2A4A] px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-600"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Ajouter un candidat
            </button>
          </div>

          <div className="space-y-3">
            {candidates.map((cand, idx) => (
              <div
                key={cand.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-teal-700 uppercase">
                    Candidat #{idx + 1}
                  </span>
                  {candidates.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeCandidateDraft(cand.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Retirer
                    </button>
                  )}
                </div>

                <div className="mt-2.5 grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Code
                    </label>
                    <input
                      type="text"
                      value={cand.code}
                      onChange={(e) => updateCandidateDraft(cand.id, { code: e.target.value.toUpperCase() })}
                      placeholder={`C0${idx + 1}`}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs font-bold uppercase"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={cand.name}
                      onChange={(e) => updateCandidateDraft(cand.id, { name: e.target.value })}
                      placeholder="Ex. Aminata Sawadogo"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Région / Catégorie / Style
                    </label>
                    <input
                      type="text"
                      value={cand.subtitle}
                      onChange={(e) => updateCandidateDraft(cand.id, { subtitle: e.target.value })}
                      placeholder="Ex. Ouagadougou · Afrobeat"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase">
                      Courte présentation
                    </label>
                    <input
                      type="text"
                      value={cand.bio}
                      onChange={(e) => updateCandidateDraft(cand.id, { bio: e.target.value })}
                      placeholder="Parcours, message aux supporters..."
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-4">
                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      {uploadingCandId === cand.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5 text-teal-600" />
                      )}
                      {cand.photoUrl ? "Photo chargée ✓" : "Photo (PNG/JPG)"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        onChange={(e) => void handleCandidatePhotoUpload(cand.id, e)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Règle commission transparente */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <p>
            <strong>Commission transparente :</strong> le votant paie exactement{" "}
            <strong>{unitVotePriceXof === 0 ? "0 FCFA" : formatXof(unitVotePriceXof)}</strong> par
            voix (0 FCFA de frais ajoutés). La commission Javeroo de{" "}
            <strong>{PRICING_CONFIG.standardCommissionPercent} %</strong> est prélevée uniquement
            sur les recettes brutes des votes payants.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || uploadingCover || Boolean(uploadingCandId)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Publier le concours de vote en ligne
        </button>
      </form>
    </div>
  );
}

