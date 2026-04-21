"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Presentation, ShieldCheck } from "lucide-react";
import { EmptyStatePanel } from "@/components/empty-state-panel";
import { PatternSummaryPanel } from "@/components/pattern-summary-panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SafetyIndicator, WallSafetyResponse } from "@/lib/types";

type WallViewProps = {
  sessionCode: string;
};

type WallResponsesPayload = {
  responses?: WallSafetyResponse[];
  error?: string;
};

const indicatorClasses: Record<SafetyIndicator, string> = {
  positive: "border-emerald-300 bg-emerald-100 text-emerald-900",
  negative: "border-red-300 bg-red-100 text-red-900",
  mixed: "border-amber-300 bg-amber-100 text-amber-950",
};

const indicatorLabels: Record<SafetyIndicator, string> = {
  positive: "Positive",
  negative: "Negative",
  mixed: "Mixed",
};
const FALLBACK_REFRESH_INTERVAL_MS = 3000;

export function WallView({ sessionCode }: WallViewProps) {
  const [responses, setResponses] = useState<WallSafetyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const wallStats = useMemo(() => {
    return {
      total: responses.length,
      pinned: responses.filter((response) => response.is_pinned).length,
    };
  }, [responses]);

  const loadResponses = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setError("");

      if (!silent) {
        setIsLoading(true);
      }

      try {
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(sessionCode)}/wall`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as WallResponsesPayload;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Could not load the class wall. Refresh the page and try again.",
          );
        }

        setResponses(payload.responses ?? []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load the class wall. Refresh the page and try again.",
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
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
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`wall-safety-responses-${sessionCode}`)
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
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      const intervalId = window.setInterval(() => {
        void loadResponses({ silent: true });
      }, FALLBACK_REFRESH_INTERVAL_MS);

      return () => window.clearInterval(intervalId);
    }
  }, [loadResponses, sessionCode]);

  return (
    <main className="min-h-screen bg-[#f7faf8] px-5 py-6 text-zinc-950 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-md border border-zinc-200 bg-white px-6 py-7 shadow-sm sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-emerald-700">
                <Presentation size={17} aria-hidden="true" />
                Session {sessionCode}
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Shared safety culture discussion wall
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-700">
                Use the anonymised reflections below to discuss patterns,
                concerns, strengths, and workplace practices that shape safety
                culture.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <WallStatChip label="Visible responses" value={wallStats.total} />
              <WallStatChip label="Pinned examples" value={wallStats.pinned} />
            </div>
          </div>
        </section>

        <div className="mt-6">
          <PatternSummaryPanel
            description="Client-side summary based on the saved visible responses for this session."
            isLoading={isLoading}
            responses={responses}
            title="Pattern summary"
          />
        </div>

        {error ? (
          <div
            className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <WallLoadingSkeleton />
        ) : null}

        {!isLoading && responses.length === 0 ? (
          <div className="mt-6">
            <EmptyStatePanel
              description="Ask students to submit an observation. Visible responses will appear here for discussion as they arrive."
              eyebrow="Class wall"
              title="No responses yet"
            />
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          {responses.map((response) => (
            <article
              className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
              key={response.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md border px-3 py-2 text-base font-bold ${indicatorClasses[response.indicator]}`}
                >
                  {indicatorLabels[response.indicator]}
                </span>
                {response.is_pinned ? (
                  <span className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-base font-bold text-zinc-900">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Pinned
                  </span>
                ) : null}
              </div>

              <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
                <WallField
                  label="Sanitised summary"
                  value={response.sanitised_summary}
                />
                <WallField
                  label="Safety culture action"
                  value={response.safety_culture_action}
                />
                <WallField
                  label="Reason"
                  value={response.reason}
                />
                <WallField
                  label="Discussion question"
                  value={response.discussion_question}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function WallField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5">
      <p className="text-sm font-semibold uppercase text-zinc-600">{label}</p>
      <p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-zinc-900">
        {value}
      </p>
    </div>
  );
}

function WallStatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4">
      <p className="text-3xl font-bold text-zinc-950">{value}</p>
      <p className="mt-1 text-base font-semibold text-zinc-600">{label}</p>
    </div>
  );
}

function WallLoadingSkeleton() {
  return (
    <div className="mt-6 grid animate-pulse gap-5 xl:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
          key={item}
        >
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-md bg-zinc-200" />
            <div className="h-10 w-24 rounded-md bg-zinc-100" />
          </div>
          <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
            {[1, 2, 3].map((line) => (
              <div className="py-5" key={line}>
                <div className="h-4 w-32 rounded-md bg-zinc-200" />
                <div className="mt-3 h-6 w-full rounded-md bg-zinc-200" />
                <div className="mt-2 h-6 w-5/6 rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
