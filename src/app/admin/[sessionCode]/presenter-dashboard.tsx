"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  DatabaseZap,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Pause,
  Pin,
  PinOff,
  Play,
  Presentation,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Trash2,
} from "lucide-react";
import { EmptyStatePanel } from "@/components/empty-state-panel";
import { PatternSummaryPanel } from "@/components/pattern-summary-panel";
import { buildPublicAppUrlWithOrigin } from "@/lib/env";
import { buildSessionPath } from "@/lib/routes";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SafetyIndicator, SafetyResponse } from "@/lib/types";

type PresenterDashboardProps = {
  sessionCode: string;
};

type ResponsesPayload = {
  responses?: SafetyResponse[];
  error?: string;
};

type ResponseMutationPayload = {
  response?: SafetyResponse;
  deleted?: boolean;
  cleared?: boolean;
  deletedCount?: number;
  error?: string;
};

type RealtimeState = "connecting" | "live" | "polling";

const FALLBACK_REFRESH_INTERVAL_MS = 3000;

const indicatorLabels: Record<SafetyIndicator, string> = {
  positive: "Positive",
  negative: "Negative",
  mixed: "Mixed",
};

const indicatorClasses: Record<SafetyIndicator, string> = {
  positive: "border-emerald-300 bg-emerald-100 text-emerald-900",
  negative: "border-red-300 bg-red-100 text-red-900",
  mixed: "border-amber-300 bg-amber-100 text-amber-950",
};

const timerPhases = [
  {
    label: "Think and submit",
    durationSeconds: 3 * 60,
  },
  {
    label: "Discuss responses",
    durationSeconds: 8 * 60,
  },
  {
    label: "Identify patterns",
    durationSeconds: 3 * 60,
  },
  {
    label: "Wrap-up",
    durationSeconds: 60,
  },
] as const;

export function PresenterDashboard({ sessionCode }: PresenterDashboardProps) {
  const [responses, setResponses] = useState<SafetyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [isClearing, setIsClearing] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");
  const [timerPhaseIndex, setTimerPhaseIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    timerPhases[0].durationSeconds,
  );
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const origin = useWindowOrigin();

  const submitPath = buildSessionPath("submit", sessionCode);
  const wallPath = buildSessionPath("wall", sessionCode);
  const studentLink = buildPublicAppUrlWithOrigin(submitPath, origin);
  const currentTimerPhase = timerPhases[timerPhaseIndex];
  const isFinalTimerPhase = timerPhaseIndex === timerPhases.length - 1;
  const timerProgressPercent =
    ((currentTimerPhase.durationSeconds - remainingSeconds) /
      currentTimerPhase.durationSeconds) *
    100;

  const summary = useMemo(() => {
    return responses.reduce(
      (counts, response) => {
        counts.total += 1;
        counts[response.indicator] += 1;

        if (response.is_visible) {
          counts.visible += 1;
        } else {
          counts.hidden += 1;
        }

        return counts;
      },
      {
        total: 0,
        visible: 0,
        hidden: 0,
        positive: 0,
        negative: 0,
        mixed: 0,
      },
    );
  }, [responses]);

  const loadResponses = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(sessionCode)}/responses`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as ResponsesPayload;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Could not load responses for this session. Refresh the page and try again.",
          );
        }

        setResponses(payload.responses ?? []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load responses for this session. Refresh the page and try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionCode],
  );

  useEffect(() => {
    let isCancelled = false;

    queueMicrotask(() => {
      if (!isCancelled) {
        void loadResponses();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [loadResponses]);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`admin-safety-responses-${sessionCode}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "safety_responses",
            filter: `session_code=eq.${sessionCode}`,
          },
          () => {
            void loadResponses({ silent: true });
          },
        )
        .subscribe((status) => {
          if (!isMounted) {
            return;
          }

          setRealtimeState(status === "SUBSCRIBED" ? "live" : "connecting");
        });

      return () => {
        isMounted = false;
        void supabase.removeChannel(channel);
      };
    } catch {
      queueMicrotask(() => setRealtimeState("polling"));

      const intervalId = window.setInterval(() => {
        void loadResponses({ silent: true });
      }, FALLBACK_REFRESH_INTERVAL_MS);

      return () => window.clearInterval(intervalId);
    }
  }, [loadResponses, sessionCode]);

  useEffect(() => {
    if (!isTimerRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  useEffect(() => {
    if (remainingSeconds === 0 && isTimerRunning) {
      queueMicrotask(() => setIsTimerRunning(false));
    }
  }, [isTimerRunning, remainingSeconds]);

  async function handleCopyStudentLink() {
    try {
      await navigator.clipboard.writeText(studentLink);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  async function updateResponse(
    id: string,
    update: Pick<Partial<SafetyResponse>, "is_visible" | "is_pinned">,
  ) {
    setPending(id, true);
    setError("");

    try {
      const response = await fetch(`/api/responses/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });
      const payload = (await response.json()) as ResponseMutationPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Could not update the response right now.",
        );
      }

      if (!payload.response) {
        throw new Error("The update response was missing the saved row.");
      }

      setResponses((current) =>
        sortResponses(
          current.map((item) =>
            item.id === id ? payload.response ?? item : item,
          ),
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update response.",
      );
    } finally {
      setPending(id, false);
    }
  }

  async function deleteResponse(id: string) {
    const shouldDelete = window.confirm(
      "Delete this response from the session? This cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    setPending(id, true);
    setError("");

    try {
      const response = await fetch(`/api/responses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ResponseMutationPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Could not delete the response right now.",
        );
      }

      setResponses((current) => current.filter((item) => item.id !== id));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete response.",
      );
    } finally {
      setPending(id, false);
    }
  }

  async function clearSession() {
    const shouldClear = window.confirm(
      `Clear all responses for session ${sessionCode}? This cannot be undone.`,
    );

    if (!shouldClear) {
      return;
    }

    setIsClearing(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionCode)}/clear`,
        {
          method: "DELETE",
        },
      );
      const payload = (await response.json()) as ResponseMutationPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Could not clear this session right now.",
        );
      }

      setResponses([]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not clear the session.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  async function loadDemoResponses() {
    const shouldLoad = window.confirm(
      `Load 6 demo responses into session ${sessionCode}? This is intended as a presentation backup.`,
    );

    if (!shouldLoad) {
      return;
    }

    setIsLoadingDemo(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionCode)}/demo`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as ResponseMutationPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Could not load demo responses right now.",
        );
      }

      await loadResponses({ silent: true });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load demo responses.",
      );
    } finally {
      setIsLoadingDemo(false);
    }
  }

  function setPending(id: string, isPending: boolean) {
    setPendingIds((current) => ({
      ...current,
      [id]: isPending,
    }));
  }

  function selectTimerPhase(phaseIndex: number) {
    setTimerPhaseIndex(phaseIndex);
    setRemainingSeconds(timerPhases[phaseIndex].durationSeconds);
    setIsTimerRunning(false);
  }

  function startOrPauseTimer() {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      return;
    }

    if (remainingSeconds === 0) {
      setRemainingSeconds(currentTimerPhase.durationSeconds);
    }

    setIsTimerRunning(true);
  }

  function resetTimer() {
    setRemainingSeconds(currentTimerPhase.durationSeconds);
    setIsTimerRunning(false);
  }

  function moveToNextTimerPhase() {
    if (isFinalTimerPhase) {
      return;
    }

    selectTimerPhase(timerPhaseIndex + 1);
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-zinc-950">
      <section className="border-b border-zinc-200 bg-white px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Session {sessionCode}
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
              Presenter Dashboard
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-700">
              {isPresentationMode
                ? "Projector-friendly presenter view for collecting responses and moving the activity forward."
                : "Share the QR code with students, monitor responses as they arrive, and moderate the class wall before discussion."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                aria-label={
                  isPresentationMode
                    ? "Exit presentation mode"
                    : "Enable presentation mode"
                }
                aria-pressed={isPresentationMode}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold transition ${
                  isPresentationMode
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "border border-zinc-300 bg-white text-zinc-950 hover:border-emerald-500 hover:bg-emerald-50"
                }`}
                onClick={() => setIsPresentationMode((current) => !current)}
                type="button"
              >
                <Presentation size={18} aria-hidden="true" />
                {isPresentationMode
                  ? "Exit presentation mode"
                  : "Presentation mode"}
              </button>

              {isPresentationMode ? (
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-base font-semibold text-white transition hover:bg-zinc-800"
                  href={wallPath}
                >
                  <ExternalLink size={18} aria-hidden="true" />
                  Switch to wall
                </Link>
              ) : (
                <>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-base font-semibold text-white transition hover:bg-zinc-800"
                    onClick={handleCopyStudentLink}
                    type="button"
                  >
                    {copyState === "copied" ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <Copy size={18} aria-hidden="true" />
                    )}
                    {copyState === "copied"
                      ? "Copied student link"
                      : copyState === "failed"
                        ? "Copy failed"
                        : "Copy student link"}
                  </button>
                  <Link
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50"
                    href={submitPath}
                    target="_blank"
                  >
                    <ExternalLink size={18} aria-hidden="true" />
                    Open student page
                  </Link>
                  <Link
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50"
                    href={wallPath}
                    target="_blank"
                  >
                    <ExternalLink size={18} aria-hidden="true" />
                    Open wall view
                  </Link>
                </>
              )}
            </div>

            {isPresentationMode ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-[#f7faf8] px-5 py-5">
                  <p className="text-sm font-semibold uppercase text-emerald-700">
                    Response count
                  </p>
                  <p className="mt-3 text-5xl font-bold text-zinc-950">
                    {summary.total}
                  </p>
                  <p className="mt-2 text-base leading-7 text-zinc-600">
                    {summary.visible} visible on the wall
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-[#f7faf8] px-5 py-5">
                  <p className="text-sm font-semibold uppercase text-emerald-700">
                    Current activity phase
                  </p>
                  <p className="mt-3 text-2xl font-bold text-zinc-950">
                    {currentTimerPhase.label}
                  </p>
                  <p className="mt-3 font-mono text-4xl font-bold text-zinc-950">
                    {formatTimer(remainingSeconds)}
                  </p>
                </div>
              </div>
            ) : null}

            {!isPresentationMode && copyState === "failed" ? (
              <p className="mt-3 text-sm text-red-700">
                Copy was blocked by the browser. Select the link below and copy
                it manually.
              </p>
            ) : null}
          </div>

          <div className="rounded-md border border-zinc-200 bg-[#f7faf8] p-6 shadow-sm">
            <div className="flex justify-center rounded-md bg-white p-4">
              <QRCodeSVG
                value={studentLink}
                size={isPresentationMode ? 320 : 250}
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#171717"
                title={`QR code for ${sessionCode} student submissions`}
              />
            </div>
            {isPresentationMode ? (
              <div className="mt-4 rounded-md border border-zinc-200 bg-white px-4 py-4 text-center">
                <p className="text-sm font-semibold uppercase text-emerald-700">
                  Student submission link
                </p>
                <p className="mt-2 text-lg font-bold text-zinc-950">
                  Scan to open /submit/{sessionCode}
                </p>
              </div>
            ) : (
              <p className="mt-4 break-all rounded-md border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-800">
                {studentLink}
              </p>
            )}
            <p className="mt-4 text-base leading-7 text-zinc-700">
              Please do not include real names, company names, exact locations,
              or confidential details. Sharing is voluntary. This activity is
              for educational discussion only.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <section className="mb-8 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-emerald-700">
                  <Clock size={17} aria-hidden="true" />
                  15-minute activity timer
                </p>
                <h2 className="mt-2 text-2xl font-bold text-zinc-950">
                  {currentTimerPhase.label}
                </h2>
                <p className="mt-2 text-base leading-7 text-zinc-600">
                  {isPresentationMode
                    ? "Use the timer controls below while keeping the projector view clean."
                    : "Presenter-only timer. It stays on this screen and does not sync with student devices."}
                </p>
              </div>

              <div className="text-left lg:text-right">
                <p className="font-mono text-6xl font-bold leading-none text-zinc-950">
                  {formatTimer(remainingSeconds)}
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-600">
                  {isTimerRunning
                    ? "Running"
                    : remainingSeconds === 0
                      ? "Phase complete"
                      : "Paused"}
                </p>
              </div>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-md bg-zinc-100">
              <div
                className="h-full rounded-md bg-emerald-500 transition-all"
                style={{ width: `${timerProgressPercent}%` }}
              />
            </div>

            {!isPresentationMode ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {timerPhases.map((phase, phaseIndex) => (
                  <button
                    aria-label={`${phase.label}, ${formatPhaseDuration(phase.durationSeconds)}`}
                    aria-pressed={phaseIndex === timerPhaseIndex}
                    className={`rounded-md border px-3 py-3 text-left font-semibold transition ${
                      phaseIndex === timerPhaseIndex
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 bg-[#f7faf8] text-zinc-800 hover:border-emerald-500"
                    }`}
                    key={phase.label}
                    onClick={() => selectTimerPhase(phaseIndex)}
                    type="button"
                  >
                    <span className="block">{phase.label}</span>
                    <span className="mt-1 block text-sm text-zinc-600">
                      {formatPhaseDuration(phase.durationSeconds)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <button
                aria-label={
                  isTimerRunning ? "Pause activity timer" : "Start activity timer"
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                onClick={startOrPauseTimer}
                type="button"
              >
                {isTimerRunning ? (
                  <Pause size={18} aria-hidden="true" />
                ) : (
                  <Play size={18} aria-hidden="true" />
                )}
                {isTimerRunning ? "Pause" : "Start"}
              </button>
              <button
                aria-label="Reset activity timer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-bold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50"
                onClick={resetTimer}
                type="button"
              >
                <RotateCcw size={18} aria-hidden="true" />
                Reset
              </button>
              <button
                aria-label="Move to the next activity phase"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 text-sm font-bold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isFinalTimerPhase}
                onClick={moveToNextTimerPhase}
                type="button"
              >
                <SkipForward size={18} aria-hidden="true" />
                Next phase
              </button>
              <div className="flex h-12 items-center rounded-md border border-zinc-200 bg-[#f7faf8] px-4 text-sm font-semibold text-zinc-700">
                Phase {timerPhaseIndex + 1} of {timerPhases.length}
              </div>
            </div>
          </section>

          {isPresentationMode ? (
            <section className="rounded-md border border-zinc-200 bg-white px-5 py-5 shadow-sm">
              <div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-950">
                    Presentation mode
                  </h2>
                  <p className="mt-2 text-base leading-7 text-zinc-600">
                    Realtime status:{" "}
                    <span className="font-semibold text-zinc-900">
                      {formatRealtimeStatus(realtimeState)}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-950">
                    Live response summary
                  </h2>
                  <p className="mt-2 text-base leading-7 text-zinc-600">
                    Realtime status:{" "}
                    <span className="font-semibold text-zinc-900">
                      {formatRealtimeStatus(realtimeState)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      isLoading || isRefreshing || isClearing || isLoadingDemo
                    }
                    onClick={() => void loadResponses({ silent: true })}
                    type="button"
                  >
                    <RefreshCw
                      className={isRefreshing ? "animate-spin" : ""}
                      size={17}
                      aria-hidden="true"
                    />
                    Refresh
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isLoading || isClearing || isLoadingDemo}
                    onClick={() => void loadDemoResponses()}
                    type="button"
                  >
                    {isLoadingDemo ? (
                      <Loader2
                        className="animate-spin"
                        size={17}
                        aria-hidden="true"
                      />
                    ) : (
                      <DatabaseZap size={17} aria-hidden="true" />
                    )}
                    Load demo responses
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      isLoading ||
                      isClearing ||
                      isLoadingDemo ||
                      summary.total === 0
                    }
                    onClick={() => void clearSession()}
                    type="button"
                  >
                    {isClearing ? (
                      <Loader2
                        className="animate-spin"
                        size={17}
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={17} aria-hidden="true" />
                    )}
                    Clear session
                  </button>
                </div>
              </div>

              {isLoading ? <AdminSummarySkeleton /> : null}

              {!isLoading ? (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <SummaryTile label="Total responses" value={summary.total} />
                  <SummaryTile
                    label="Visible responses"
                    value={summary.visible}
                  />
                  <SummaryTile label="Hidden responses" value={summary.hidden} />
                  <SummaryTile label="Positive" value={summary.positive} />
                  <SummaryTile label="Negative" value={summary.negative} />
                  <SummaryTile label="Mixed" value={summary.mixed} />
                </div>
              ) : null}

              <div className="mt-5">
                <PatternSummaryPanel
                  description="Client-side summary of the saved session responses for presenter discussion."
                  isLoading={isLoading}
                  responses={responses}
                  title="Pattern summary"
                />
              </div>
            </>
          )}

          {error ? (
            <div
              className="mt-5 flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
              role="alert"
            >
              <AlertCircle
                className="mt-0.5 shrink-0"
                size={20}
                aria-hidden="true"
              />
              <p className="text-sm leading-6">{error}</p>
            </div>
          ) : null}

          {!isPresentationMode ? (
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-zinc-950">
                Session responses
              </h2>

              {isLoading ? (
                <AdminResponseSkeletonGrid />
              ) : null}

              {!isLoading && responses.length === 0 ? (
                <div className="mt-5">
                  <EmptyStatePanel
                    description="Ask students to scan the QR code or open the student link. New responses will appear here and can be moderated as they arrive."
                    eyebrow="Presenter view"
                    title="No responses yet"
                  />
                </div>
              ) : null}

              <div className="mt-5 grid gap-4">
                {responses.map((response) => (
                  <AdminResponseCard
                    isPending={Boolean(pendingIds[response.id])}
                    key={response.id}
                    onDelete={() => void deleteResponse(response.id)}
                    onTogglePin={() =>
                      void updateResponse(response.id, {
                        is_pinned: !response.is_pinned,
                      })
                    }
                    onToggleVisibility={() =>
                      void updateResponse(response.id, {
                        is_visible: !response.is_visible,
                      })
                    }
                    response={response}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-4xl font-bold text-zinc-950">{value}</p>
      <p className="mt-2 text-base font-semibold leading-6 text-zinc-600">
        {label}
      </p>
    </div>
  );
}

function AdminResponseCard({
  response,
  isPending,
  onToggleVisibility,
  onTogglePin,
  onDelete,
}: {
  response: SafetyResponse;
  isPending: boolean;
  onToggleVisibility: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`rounded-md border bg-white p-6 shadow-sm ${
        response.is_visible ? "border-zinc-200" : "border-zinc-300 opacity-75"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md border px-3 py-2 text-base font-bold ${indicatorClasses[response.indicator]}`}
            >
              {indicatorLabels[response.indicator]}
            </span>
            {response.is_pinned ? (
              <span className="inline-flex rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-base font-bold text-zinc-900">
                Pinned
              </span>
            ) : null}
            {!response.is_visible ? (
              <span className="inline-flex rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-base font-bold text-zinc-700">
                Hidden
              </span>
            ) : null}
          </div>
          <time className="mt-3 block text-base font-semibold text-zinc-500">
            {formatCreatedTime(response.created_at)}
          </time>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            aria-label={`${response.is_visible ? "Hide" : "Show"} response: ${buildResponseLabel(response.sanitised_summary)}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 text-base font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={onToggleVisibility}
            type="button"
          >
            {response.is_visible ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
            {response.is_visible ? "Hide" : "Show"}
          </button>
          <button
            aria-label={`${response.is_pinned ? "Unpin" : "Pin"} response: ${buildResponseLabel(response.sanitised_summary)}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 text-base font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={onTogglePin}
            type="button"
          >
            {response.is_pinned ? (
              <PinOff size={16} aria-hidden="true" />
            ) : (
              <Pin size={16} aria-hidden="true" />
            )}
            {response.is_pinned ? "Unpin" : "Pin"}
          </button>
          <button
            aria-label={`Delete response: ${buildResponseLabel(response.sanitised_summary)}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-300 px-3 text-base font-semibold text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            onClick={onDelete}
            type="button"
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200">
        <ResponseField
          label="Sanitised summary"
          value={response.sanitised_summary}
        />
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase text-zinc-600">
            Raw submission
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-zinc-900">
            {response.original_observation || "No raw submission stored."}
          </p>
        </details>
        <ResponseField
          label="Safety culture action"
          value={response.safety_culture_action}
        />
        <ResponseField label="Reason" value={response.reason} />
        <ResponseField
          label="Proposed action"
          value={response.proposed_action}
        />
        <ResponseField
          label="Discussion question"
          value={response.discussion_question}
        />
      </div>
    </article>
  );
}

function ResponseField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5">
      <p className="text-sm font-semibold uppercase text-zinc-600">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function AdminSummarySkeleton() {
  return (
    <div className="mt-5 grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          key={item}
        >
          <div className="h-10 w-12 rounded-md bg-zinc-200" />
          <div className="mt-3 h-5 w-full rounded-md bg-zinc-200" />
        </div>
      ))}
    </div>
  );
}

function AdminResponseSkeletonGrid() {
  return (
    <div className="mt-5 grid animate-pulse gap-4">
      {[1, 2, 3].map((item) => (
        <div
          className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm"
          key={item}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex gap-2">
                <div className="h-10 w-28 rounded-md bg-zinc-200" />
                <div className="h-10 w-24 rounded-md bg-zinc-100" />
              </div>
              <div className="mt-4 h-5 w-36 rounded-md bg-zinc-200" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[1, 2, 3].map((button) => (
                <div
                  className="h-11 w-28 rounded-md bg-zinc-200"
                  key={button}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 divide-y divide-zinc-200 border-y border-zinc-200">
            {[1, 2, 3, 4].map((line) => (
              <div className="py-5" key={line}>
                <div className="h-4 w-32 rounded-md bg-zinc-200" />
                <div className="mt-3 h-6 w-full rounded-md bg-zinc-200" />
                <div className="mt-2 h-6 w-4/5 rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCreatedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Created time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortResponses(responses: SafetyResponse[]) {
  return [...responses].sort((first, second) => {
    if (first.is_pinned !== second.is_pinned) {
      return first.is_pinned ? -1 : 1;
    }

    return (
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime()
    );
  });
}

function formatRealtimeStatus(state: RealtimeState) {
  if (state === "live") {
    return "Live";
  }

  if (state === "polling") {
    return "Polling";
  }

  return "Connecting";
}

function buildResponseLabel(summary: string) {
  return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatPhaseDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);

  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

function useWindowOrigin() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );
}

function subscribeToNothing() {
  return () => undefined;
}
