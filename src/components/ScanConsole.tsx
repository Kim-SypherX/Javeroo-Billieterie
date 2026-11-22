"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  CloudDownload,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import {
  countCachedTicketsForEvent,
  listPendingOfflineCheckins,
  removePendingOfflineCheckins,
  saveEventManifestOffline,
  verifyAndCheckinOffline,
  type OfflineManifestTicket,
} from "@/modules/checkin/offline-db";
import type { CheckinOutcome } from "@/modules/events/store";

interface ScanEventOption {
  id: string;
  title: string;
  city: string;
}

interface ScanConsoleProps {
  events: ScanEventOption[];
  initialEventId?: string;
  initialCode?: string;
  initialAccessCode?: string;
}

interface ScanHistoryEntry {
  at: string;
  code: string;
  status: CheckinOutcome["status"];
  label: string;
  mode: "online" | "offline";
}

function playFeedbackTone(status: CheckinOutcome["status"]) {
  try {
    if (typeof window === "undefined") return;
    if ("vibrate" in navigator) {
      navigator.vibrate(status === "VALID" ? 90 : [120, 70, 120]);
    }
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = status === "VALID" ? "sine" : "sawtooth";
    osc.frequency.value = status === "VALID" ? 880 : status === "WRONG_EVENT" ? 440 : 220;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + (status === "VALID" ? 0.14 : 0.28));
  } catch {
    // Audio optionnel selon permissions navigateur
  }
}

export function ScanConsole({
  events,
  initialEventId,
  initialCode,
  initialAccessCode,
}: ScanConsoleProps) {
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId && events.some((e) => e.id === initialEventId)
      ? initialEventId
      : (events[0]?.id ?? ""),
  );
  const [gateLabel, setGateLabel] = useState("Entrée Principale");
  const [accessCodeInput, setAccessCodeInput] = useState(initialAccessCode ?? "");
  const [codeInput, setCodeInput] = useState(initialCode ?? "");

  const [isOnline, setIsOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const effectiveOnline = isOnline && !simulateOffline;

  const [cachedCount, setCachedCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<{
    status: CheckinOutcome["status"];
    message: string;
    attendeeName?: string;
    tierName?: string;
  } | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  // Caméra QR native (BarcodeDetector)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });

  const refreshLocalStats = useCallback(async (evtId: string) => {
    try {
      const [cached, pending] = await Promise.all([
        countCachedTicketsForEvent(evtId),
        listPendingOfflineCheckins(),
      ]);
      setCachedCount(cached);
      setPendingSyncCount(pending.length);
    } catch {
      // IndexedDB indisponible
    }
  }, []);

  const syncPendingToServer = useCallback(async () => {
    try {
      const pending = await listPendingOfflineCheckins();
      if (pending.length === 0) return;

      const res = await fetch("/api/scan/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkins: pending }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        await removePendingOfflineCheckins(data.syncedIds ?? []);
        await refreshLocalStats(selectedEventId);
        const conflictNote =
          data.conflicts?.length > 0
            ? ` (${data.conflicts.length} conflit(s) détecté(s) entre portes)`
            : "";
        setSyncMessage(`${data.syncedCount} passage(s) hors-ligne synchronisé(s)${conflictNote}.`);
      }
    } catch {
      // Sera retenté au prochain retour en ligne
    }
  }, [refreshLocalStats, selectedEventId]);

  const loadOfflineManifest = useCallback(
    async (opts?: { accessCode?: string; eventId?: string }) => {
      setSyncMessage(null);
      try {
        const qs = opts?.accessCode
          ? `accessCode=${encodeURIComponent(opts.accessCode)}`
          : `eventId=${encodeURIComponent(opts?.eventId ?? selectedEventId)}`;
        const res = await fetch(`/api/scan/manifest?${qs}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setSyncMessage(data.error ?? "Impossible de charger le cache hors-ligne.");
          return;
        }
        if (data.eventId) setSelectedEventId(data.eventId);
        if (data.gateLabel) setGateLabel(data.gateLabel);

        const count = await saveEventManifestOffline(
          data.eventId,
          (data.tickets ?? []) as OfflineManifestTicket[],
        );
        await refreshLocalStats(data.eventId);
        setSyncMessage(
          `Cache hors-ligne prêt : ${count} billet(s) synchronisé(s) pour "${data.eventTitle}".`,
        );
      } catch {
        setSyncMessage("Erreur de chargement du manifeste (vérifiez la connexion initiale).");
      }
    },
    [refreshLocalStats, selectedEventId],
  );

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => {
      setIsOnline(true);
      void syncPendingToServer();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [syncPendingToServer]);

  useEffect(() => {
    if (initialAccessCode) {
      void loadOfflineManifest({ accessCode: initialAccessCode });
    } else if (selectedEventId) {
      void refreshLocalStats(selectedEventId);
    }
  }, [initialAccessCode, selectedEventId, loadOfflineManifest, refreshLocalStats]);

  const verifyCode = useCallback(
    async (rawValue: string) => {
      const value = rawValue.trim();
      if (!value || !selectedEventId) return;
      setChecking(true);

      try {
        if (!effectiveOnline) {
          const offlineOutcome = await verifyAndCheckinOffline({
            codeOrPayload: value,
            expectedEventId: selectedEventId,
            gateLabel: gateLabel.trim() || "Entrée Principale",
          });
          playFeedbackTone(offlineOutcome.status);
          setOutcome({
            status: offlineOutcome.status,
            message: offlineOutcome.message,
            attendeeName:
              "ticket" in offlineOutcome ? offlineOutcome.ticket?.attendeeName : undefined,
            tierName: "ticket" in offlineOutcome ? offlineOutcome.ticket?.tierName : undefined,
          });
          setHistory((prev) => [
            {
              at: new Date().toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              code: value.slice(0, 24),
              status: offlineOutcome.status,
              label:
                offlineOutcome.status === "VALID"
                  ? `${offlineOutcome.ticket.attendeeName} (${offlineOutcome.ticket.tierName})`
                  : offlineOutcome.message,
              mode: "offline",
            },
            ...prev.slice(0, 14),
          ]);
          await refreshLocalStats(selectedEventId);
          if (offlineOutcome.status === "VALID") setCodeInput("");
          return;
        }

        const res = await fetch("/api/scan/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codeOrPayload: value,
            expectedEventId: selectedEventId,
            gateLabel: gateLabel.trim() || "Entrée Principale",
          }),
        });
        const data: CheckinOutcome = await res.json();
        playFeedbackTone(data.status);
        setOutcome({
          status: data.status,
          message: data.message,
          attendeeName: "ticket" in data ? data.ticket?.attendeeName : undefined,
          tierName: "ticket" in data ? data.ticket?.tierName : undefined,
        });
        setHistory((prev) => [
          {
            at: new Date().toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            code: value.slice(0, 24),
            status: data.status,
            label:
              data.status === "VALID"
                ? `${data.ticket.attendeeName} (${data.ticket.tierName})`
                : data.message,
            mode: "online",
          },
          ...prev.slice(0, 14),
        ]);
        if (data.status === "VALID") setCodeInput("");
      } catch {
        // Fallback automatique vers IndexedDB en cas de perte réseau soudaine
        const fallback = await verifyAndCheckinOffline({
          codeOrPayload: value,
          expectedEventId: selectedEventId,
          gateLabel: gateLabel.trim() || "Entrée Principale",
        });
        playFeedbackTone(fallback.status);
        setOutcome({
          status: fallback.status,
          message: fallback.message,
          attendeeName: "ticket" in fallback ? fallback.ticket?.attendeeName : undefined,
          tierName: "ticket" in fallback ? fallback.ticket?.tierName : undefined,
        });
        await refreshLocalStats(selectedEventId);
      } finally {
        setChecking(false);
      }
    },
    [effectiveOnline, gateLabel, refreshLocalStats, selectedEventId],
  );

  // Gestion Caméra QR native (BarcodeDetector)
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  async function toggleCamera() {
    if (cameraActive) {
      stopCamera();
      return;
    }
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Caméra non disponible sur cet appareil. Utilisez la saisie ou une douchette.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setCameraError("Autorisation caméra refusée ou aucune caméra détectée.");
    }
  }

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play();

    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setCameraError(
        "La détection QR caméra native n'est pas activée sur ce navigateur (supportée sur Chrome/Edge). Utilisez le champ ci-dessous.",
      );
      return;
    }

    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    const interval = window.setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        const first = codes[0]?.rawValue;
        if (!first) return;
        const now = Date.now();
        if (first === lastScannedRef.current.value && now - lastScannedRef.current.at < 2500) {
          return;
        }
        lastScannedRef.current = { value: first, at: now };
        setCodeInput(first);
        void verifyCode(first);
      } catch {
        // Ignore frame error
      }
    }, 350);

    return () => {
      window.clearInterval(interval);
    };
  }, [cameraActive, verifyCode]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div className="space-y-6">
      {/* En-tête + Statut réseau + Préchargement hors-ligne */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B2A4A] text-teal-300">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold text-[#1B2A4A]">
                Contrôle d&apos;accès porte (Offline-First)
              </h1>
              <p className="text-xs text-slate-600">
                Caméra QR + Cache local IndexedDB · Zéro accès aux chiffres financiers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                effectiveOnline
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {effectiveOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  Connecté
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Hors-ligne ({cachedCount} en cache)
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                const nextSim = !simulateOffline;
                setSimulateOffline(nextSim);
                if (!nextSim) void syncPendingToServer();
              }}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {simulateOffline ? "Revenir en ligne" : "Simuler coupure 4G"}
            </button>
          </div>
        </div>

        {/* Connexion rapide par code d'accès porte */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (accessCodeInput.trim()) {
              void loadOfflineManifest({ accessCode: accessCodeInput.trim() });
            }
          }}
          className="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            <label htmlFor="gate-access-code" className="sr-only">
              Code d&apos;accès porte agent
            </label>
            <input
              id="gate-access-code"
              type="text"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value)}
              placeholder="Code d'accès porte (ex. GATE-AFRO-01)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs uppercase"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-600"
          >
            Appairer &amp; charger hors-ligne
          </button>
        </form>

        {/* Sélecteur événement + Porte + Boutons Cache/Sync */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="scan-event-select"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Événement contrôlé
            </label>
            <select
              id="scan-event-select"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setOutcome(null);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="scan-gate-input"
              className="block text-xs font-bold text-slate-700 uppercase"
            >
              Nom de la porte
            </label>
            <input
              id="scan-gate-input"
              type="text"
              value={gateLabel}
              onChange={(e) => setGateLabel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOfflineManifest({ eventId: selectedEventId })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-900 hover:bg-teal-100"
          >
            <CloudDownload className="h-4 w-4" aria-hidden="true" />
            Charger en cache hors-ligne ({cachedCount})
          </button>

          <button
            type="button"
            onClick={() => void toggleCamera()}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
              cameraActive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#1B2A4A] text-white hover:bg-teal-600"
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="h-4 w-4" aria-hidden="true" />
                Arrêter la caméra
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Scanner avec la caméra
              </>
            )}
          </button>

          {pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={() => void syncPendingToServer()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Synchroniser ({pendingSyncCount} en attente)
            </button>
          )}
        </div>

        {syncMessage && (
          <p className="mt-3 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800">
            {syncMessage}
          </p>
        )}

        {cameraError && (
          <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
            {cameraError}
          </p>
        )}

        {cameraActive && (
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-teal-500 bg-black">
            <video ref={videoRef} playsInline muted className="h-60 w-full object-cover" />
          </div>
        )}

        {/* Saisie manuelle / Douchette */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verifyCode(codeInput);
          }}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1">
            <label htmlFor="scan-code-input" className="sr-only">
              Code billet ou payload QR scanné
            </label>
            <input
              id="scan-code-input"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Scannez un QR code ou saisissez un code court (ex. JVR-DEMO-2026)"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={checking || !codeInput.trim()}
            className="rounded-xl bg-[#1B2A4A] px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-40"
          >
            {checking ? "Vérification..." : "Valider l'entrée"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Test rapide :</span>
          <button
            type="button"
            onClick={() => {
              setCodeInput("JVR-DEMO-2026");
              void verifyCode("JVR-DEMO-2026");
            }}
            className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono font-semibold text-[#1B2A4A] hover:bg-teal-100"
          >
            Tester JVR-DEMO-2026
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeInput("v1.faux.evt.VIP.signatureinvalide");
              void verifyCode("v1.faux.evt.VIP.signatureinvalide");
            }}
            className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100"
          >
            Tester un faux QR
          </button>
        </div>
      </div>

      {/* Écran résultat haute visibilité (Vert / Rouge / Orange) */}
      {outcome && (
        <div
          role="status"
          aria-live="assertive"
          className={`rounded-3xl border-2 p-6 shadow-md sm:p-8 ${
            outcome.status === "VALID"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : outcome.status === "WRONG_EVENT"
                ? "border-amber-500 bg-amber-500 text-slate-950"
                : "border-red-600 bg-red-600 text-white"
          }`}
        >
          <div className="flex items-start gap-4">
            {outcome.status === "VALID" && (
              <CheckCircle2 className="h-12 w-12 shrink-0" aria-hidden="true" />
            )}
            {outcome.status === "ALREADY_USED" && (
              <XCircle className="h-12 w-12 shrink-0" aria-hidden="true" />
            )}
            {outcome.status === "INVALID" && (
              <ShieldAlert className="h-12 w-12 shrink-0" aria-hidden="true" />
            )}
            {outcome.status === "WRONG_EVENT" && (
              <AlertTriangle className="h-12 w-12 shrink-0" aria-hidden="true" />
            )}

            <div>
              <p className="text-xs font-bold tracking-widest uppercase opacity-90">
                {outcome.status === "VALID"
                  ? "BILLET VALIDE — LAISSER ENTRER"
                  : outcome.status === "ALREADY_USED"
                    ? "REFUSÉ — BILLET DÉJÀ UTILISÉ"
                    : outcome.status === "WRONG_EVENT"
                      ? "ATTENTION — MAUVAIS ÉVÉNEMENT"
                      : "REFUSÉ — BILLET INVALIDE"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold">
                {outcome.attendeeName
                  ? `${outcome.attendeeName}${outcome.tierName ? ` · ${outcome.tierName}` : ""}`
                  : outcome.message}
              </p>
              <p className="mt-1.5 text-sm opacity-95">{outcome.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Journal des derniers passages */}
      {history.length > 0 && (
        <section
          aria-labelledby="scan-history-title"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
        >
          <h2 id="scan-history-title" className="font-display text-base font-bold text-[#1B2A4A]">
            Derniers passages contrôlés ({history.length})
          </h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {history.map((item, idx) => (
              <li
                key={`${item.at}-${idx}`}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {item.at} · {item.mode === "offline" ? "HORS-LIGNE" : "EN LIGNE"}
                  </span>
                  <p className="truncate font-medium text-slate-800">{item.label}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    item.status === "VALID"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.status === "WRONG_EVENT"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.status === "VALID"
                    ? "Validé"
                    : item.status === "ALREADY_USED"
                      ? "Doublon"
                      : item.status === "WRONG_EVENT"
                        ? "Autre date"
                        : "Refusé"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
