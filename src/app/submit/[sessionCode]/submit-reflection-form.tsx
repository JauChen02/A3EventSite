"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { SafetyIndicator, SafetyResponse } from "@/lib/types";

const MAX_OBSERVATION_LENGTH = 1500;

const sampleObservations = [
  {
    label: "Positive induction",
    preview: "Clear induction, emergency procedures, PPE expectations.",
    text: "During my internship, new starters were given a clear safety induction before entering the work area. The supervisor checked that everyone understood emergency procedures, reporting channels, PPE expectations, and what to do if something felt unsafe.",
  },
  {
    label: "Ignored hazard report",
    preview: "A reported trip hazard stayed in place for days.",
    text: "A student noticed a trip hazard near a shared walkway and reported it to a supervisor. The concern was acknowledged, but no one fixed it or followed up for several days, so people kept walking around the same hazard.",
  },
  {
    label: "Mixed PPE use",
    preview: "PPE was available, but people used it inconsistently.",
    text: "The workplace had PPE available and posters explaining when to use it, but staff used it inconsistently. Some team members followed the rules carefully, while others skipped PPE when the area was busy or the task seemed quick.",
  },
] as const;

type SubmitReflectionFormProps = {
  sessionCode: string;
};

type SubmitState = "idle" | "loading" | "success" | "error";

type AnalyseErrorResponse = {
  error?: string;
};

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

export function SubmitReflectionForm({ sessionCode }: SubmitReflectionFormProps) {
  const [observation, setObservation] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SafetyResponse | null>(null);

  const trimmedObservation = observation.trim();
  const remainingCharacters = MAX_OBSERVATION_LENGTH - observation.length;
  const isSubmitting = status === "loading";
  const canSubmit = trimmedObservation.length > 0 && !isSubmitting;

  const counterClassName = useMemo(() => {
    if (remainingCharacters < 0) {
      return "text-red-700";
    }

    if (remainingCharacters <= 150) {
      return "text-amber-700";
    }

    return "text-zinc-600";
  }, [remainingCharacters]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedObservation) {
      setStatus("error");
      setError("Write an observation before submitting.");
      return;
    }

    if (trimmedObservation.length > MAX_OBSERVATION_LENGTH) {
      setStatus("error");
      setError(
        `Keep your observation to ${MAX_OBSERVATION_LENGTH} characters or fewer.`,
      );
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionCode,
          observation: trimmedObservation,
        }),
      });

      const data = (await response.json()) as SafetyResponse | AnalyseErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Could not analyse your observation.",
        );
      }

      setResult(data as SafetyResponse);
      setObservation("");
      setStatus("success");
    } catch (caughtError) {
      setStatus("error");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not analyse your observation right now. Please try again in a moment.",
      );
    }
  }

  function handleSampleClick(text: string) {
    setObservation(text);
    setResult(null);
    setError("");
    setStatus("idle");
  }

  function handleStartAnother() {
    setResult(null);
    setStatus("idle");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] text-zinc-950">
      <section className="border-b border-zinc-200 bg-white px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid size-12 shrink-0 place-items-center rounded-md bg-emerald-500 text-white shadow-sm">
              <ShieldCheck size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0 max-w-3xl">
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Session {sessionCode}
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
                Safety Culture Reflection Activity
              </h1>
              <p className="mt-4 text-base leading-7 text-zinc-700 sm:text-lg sm:leading-8">
                Share one anonymised observation from your internship so the
                class can discuss what safety culture looks like in practice.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-md border border-zinc-200 bg-[#f7faf8] p-5 text-base leading-7 text-zinc-700">
            <p className="font-semibold text-zinc-900">
              Write one anonymised workplace safety culture observation.
            </p>
            <p>
              Do not include real names, company names, exact locations, or
              confidential details.
            </p>
            <p>Sharing is voluntary.</p>
            <p>
              This tool is for educational discussion only, not formal safety or
              legal advice.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <aside className="grid gap-5">
            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Before you submit
              </p>
              <div className="mt-4 grid gap-4 text-base leading-7 text-zinc-700">
                <div className="rounded-md bg-[#f7faf8] px-4 py-4">
                  Focus on the situation, the practice, or the workplace
                  culture.
                </div>
                <div className="rounded-md bg-[#f7faf8] px-4 py-4">
                  Keep it brief and specific so the class can discuss it clearly.
                </div>
                <div className="rounded-md bg-[#f7faf8] px-4 py-4">
                  The public wall shows only the sanitised summary, not your raw
                  text.
                </div>
              </div>
            </section>

            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-semibold uppercase text-emerald-700">
                Try a sample
              </p>
              <div className="mt-4 grid gap-3">
                {sampleObservations.map((sample) => (
                  <button
                    aria-label={`Use sample observation: ${sample.label}`}
                    className="rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    key={sample.label}
                    onClick={() => handleSampleClick(sample.text)}
                    type="button"
                  >
                    <span className="block text-base font-semibold text-zinc-900">
                      {sample.label}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-zinc-600">
                      {sample.preview}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <div className="grid gap-5">
            <form
              className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
              onSubmit={handleSubmit}
            >
              <label
                className="text-2xl font-bold text-zinc-950"
                htmlFor="observation"
              >
                Your observation
              </label>
              <p
                className="mt-3 text-base leading-7 text-zinc-600"
                id="observation-guidance"
              >
                Keep it specific, brief, and anonymised. Focus on the workplace
                practice or culture, not individual blame.
              </p>

              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-base font-semibold text-amber-950">
                  Anonymise before you submit.
                </p>
                <p className="mt-2 text-base leading-7 text-amber-900">
                  Do not include names, company names, exact locations, client
                  names, or confidential workplace details.
                </p>
              </div>

              <textarea
                aria-describedby="observation-guidance observation-counter"
                aria-invalid={status === "error" && Boolean(error)}
                className="mt-5 min-h-64 w-full resize-y rounded-md border border-zinc-300 bg-white p-4 text-lg leading-8 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                disabled={isSubmitting}
                id="observation"
                maxLength={MAX_OBSERVATION_LENGTH}
                onChange={(event) => {
                  setObservation(event.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setError("");
                  }
                }}
                placeholder="Example: During my internship, I noticed..."
                value={observation}
              />

              <div className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-start sm:justify-between">
                <p
                  className={`text-base font-semibold ${counterClassName}`}
                  id="observation-counter"
                >
                  {observation.length}/{MAX_OBSERVATION_LENGTH}
                </p>
                <p className="text-base leading-7 text-zinc-500 sm:text-right">
                  Your original text is stored privately and is not shown on the
                  public wall.
                </p>
              </div>

              {status === "error" && error ? (
                <div
                  className="mt-5 flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900"
                  role="alert"
                >
                  <AlertCircle
                    className="mt-0.5 shrink-0"
                    size={20}
                    aria-hidden="true"
                  />
                  <p className="text-base leading-7">{error}</p>
                </div>
              ) : null}

              <button
                className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-lg font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                disabled={!canSubmit}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                    Analysing...
                  </>
                ) : (
                  "Analyse my observation"
                )}
              </button>

              <p className="mt-4 text-sm leading-6 text-zinc-500 sm:text-base">
                Final reminder: remove names, company names, exact locations,
                and confidential details before sending.
              </p>
            </form>

            {isSubmitting ? (
              <div
                aria-live="polite"
                className="rounded-md border border-amber-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-center gap-3 text-amber-950">
                  <MessageSquareText size={22} aria-hidden="true" />
                  <p className="text-lg font-semibold">
                    Analysing your anonymised observation...
                  </p>
                </div>
                <div className="mt-5 animate-pulse divide-y divide-zinc-200 border-y border-zinc-200">
                  {[1, 2, 3, 4].map((item) => (
                    <div className="py-4" key={item}>
                      <div className="h-4 w-32 rounded-md bg-zinc-200" />
                      <div className="mt-3 h-6 w-full rounded-md bg-zinc-200" />
                      <div className="mt-2 h-6 w-4/5 rounded-md bg-zinc-200" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {status === "success" && result ? (
              <section
                aria-live="polite"
                className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-1 shrink-0 text-emerald-700"
                    size={26}
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-3xl font-bold leading-tight text-zinc-950">
                      Analysis ready
                    </h2>
                    <p className="mt-3 text-lg leading-8 text-emerald-800">
                      Your response has been added to the shared class wall.
                    </p>
                  </div>
                </div>

                <div className="mt-6 divide-y divide-zinc-200 border-y border-zinc-200">
                  <AnalysisItem
                    label="Sanitised summary"
                    value={result.sanitised_summary}
                  />
                  <div className="py-5">
                    <p className="text-sm font-semibold uppercase text-zinc-600">
                      Indicator
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-md border px-3 py-2 text-base font-bold ${indicatorClasses[result.indicator]}`}
                    >
                      {indicatorLabels[result.indicator]}
                    </span>
                  </div>
                  <AnalysisItem
                    label="Safety culture action"
                    value={result.safety_culture_action}
                  />
                  <AnalysisItem label="Reason" value={result.reason} />
                  <AnalysisItem
                    label="Proposed action"
                    value={result.proposed_action}
                  />
                  <AnalysisItem
                    label="Discussion question"
                    value={result.discussion_question}
                  />
                </div>

                <div className="mt-6 rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4">
                  <p className="text-sm font-semibold uppercase text-zinc-600">
                    Privacy reminder
                  </p>
                  <p className="mt-2 text-base leading-7 text-zinc-800">
                    {result.privacy_reminder}
                  </p>
                </div>

                <button
                  className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md border border-zinc-300 px-5 text-base font-semibold text-zinc-950 transition hover:border-emerald-500 hover:bg-emerald-50"
                  onClick={handleStartAnother}
                  type="button"
                >
                  Submit another observation
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function AnalysisItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5">
      <p className="text-sm font-semibold uppercase text-zinc-600">{label}</p>
      <p className="mt-3 text-lg leading-8 text-zinc-900">{value}</p>
    </div>
  );
}
