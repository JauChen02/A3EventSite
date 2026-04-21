"use client";

import { useMemo } from "react";
import type { PatternSummaryResponse, SafetyIndicator } from "@/lib/types";

type PatternSummaryPanelProps = {
  responses: PatternSummaryResponse[];
  title: string;
  description: string;
  isLoading?: boolean;
};

const indicatorOrder: SafetyIndicator[] = ["positive", "negative", "mixed"];

export function PatternSummaryPanel({
  responses,
  title,
  description,
  isLoading = false,
}: PatternSummaryPanelProps) {
  const summary = useMemo(() => buildPatternSummary(responses), [responses]);

  return (
    <section className="rounded-md border border-zinc-200 bg-white px-5 py-6 shadow-sm sm:px-6 sm:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-bold leading-tight text-zinc-950 sm:text-3xl">
            {title}
          </h3>
          <p className="mt-3 text-base leading-7 text-zinc-600">
            {description}
          </p>
        </div>
        <div className="inline-flex h-11 items-center rounded-md border border-zinc-200 bg-[#f7faf8] px-4 text-base font-semibold text-zinc-800">
          {responses.length} {responses.length === 1 ? "response" : "responses"}
        </div>
      </div>

      {isLoading ? (
        <PatternSummarySkeleton />
      ) : responses.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-zinc-300 bg-[#f7faf8] p-6">
          <p className="text-xl font-semibold text-zinc-950">No patterns yet.</p>
          <p className="mt-3 text-base leading-7 text-zinc-600">
            Responses need to arrive before theme, sentiment, and discussion
            patterns can be summarised.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h4 className="text-base font-semibold text-zinc-800">
              Most common themes
            </h4>
            <div className="mt-4 grid gap-3">
              {summary.topThemes.length > 0 ? (
                summary.topThemes.map((theme) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4"
                    key={theme.name}
                  >
                    <p className="text-base font-semibold capitalize text-zinc-900 sm:text-lg">
                      {formatThemeLabel(theme.name)}
                    </p>
                    <span className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-base font-bold text-zinc-900">
                      {theme.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-zinc-300 bg-[#f7faf8] px-4 py-4 text-base leading-7 text-zinc-600">
                  No themes have been saved yet for these responses.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <h4 className="text-base font-semibold text-zinc-800">
                Indicator mix
              </h4>
              <div className="mt-4 grid gap-3">
                {indicatorOrder.map((indicator) => (
                  <div
                    className="rounded-md border border-zinc-200 bg-[#f7faf8] p-4"
                    key={indicator}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold capitalize text-zinc-900">
                        {indicator}
                      </p>
                      <p className="text-2xl font-bold text-zinc-950">
                        {summary.percentages[indicator]}%
                      </p>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-md bg-zinc-200">
                      <div
                        className={`h-full rounded-md ${
                          indicator === "positive"
                            ? "bg-emerald-500"
                            : indicator === "negative"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                        style={{ width: `${summary.percentages[indicator]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold text-zinc-800">
                Suggested discussion prompts
              </h4>
              <div className="mt-4 grid gap-3">
                {summary.prompts.map((prompt, index) => (
                  <div
                    className="rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4 text-base leading-7 text-zinc-800"
                    key={prompt}
                  >
                    <span className="mr-2 font-bold text-zinc-950">
                      {index + 1}.
                    </span>
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PatternSummarySkeleton() {
  return (
    <div className="mt-6 grid animate-pulse gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="h-6 w-44 rounded-md bg-zinc-200" />
        <div className="mt-4 grid gap-3">
          {[1, 2, 3].map((item) => (
            <div
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4"
              key={item}
            >
              <div className="h-5 w-40 rounded-md bg-zinc-200" />
              <div className="h-8 w-12 rounded-md bg-white" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        <div>
          <div className="h-6 w-32 rounded-md bg-zinc-200" />
          <div className="mt-4 grid gap-3">
            {[1, 2, 3].map((item) => (
              <div
                className="rounded-md border border-zinc-200 bg-[#f7faf8] p-4"
                key={item}
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 rounded-md bg-zinc-200" />
                  <div className="h-7 w-14 rounded-md bg-zinc-200" />
                </div>
                <div className="mt-4 h-3 rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="h-6 w-52 rounded-md bg-zinc-200" />
          <div className="mt-4 grid gap-3">
            {[1, 2, 3].map((item) => (
              <div
                className="rounded-md border border-zinc-200 bg-[#f7faf8] px-4 py-4"
                key={item}
              >
                <div className="h-5 w-full rounded-md bg-zinc-200" />
                <div className="mt-2 h-5 w-4/5 rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildPatternSummary(responses: PatternSummaryResponse[]) {
  const themeCounts = new Map<string, number>();
  const indicatorCounts: Record<SafetyIndicator, number> = {
    positive: 0,
    negative: 0,
    mixed: 0,
  };

  for (const response of responses) {
    indicatorCounts[response.indicator] += 1;

    for (const theme of response.themes ?? []) {
      const normalizedTheme = theme.trim().toLowerCase();

      if (!normalizedTheme) {
        continue;
      }

      themeCounts.set(normalizedTheme, (themeCounts.get(normalizedTheme) ?? 0) + 1);
    }
  }

  const totalResponses = responses.length;
  const topThemes = [...themeCounts.entries()]
    .sort((first, second) => {
      if (second[1] !== first[1]) {
        return second[1] - first[1];
      }

      return first[0].localeCompare(second[0]);
    })
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const themeNames = topThemes.map((theme) => theme.name);
  const prompts = buildSuggestedPrompts(themeNames);

  return {
    topThemes,
    prompts,
    percentages: {
      positive: calculatePercentage(indicatorCounts.positive, totalResponses),
      negative: calculatePercentage(indicatorCounts.negative, totalResponses),
      mixed: calculatePercentage(indicatorCounts.mixed, totalResponses),
    },
  };
}

function buildSuggestedPrompts(themeNames: string[]) {
  const prompts = [
    "What made these examples positive or negative?",
    "What practice would you encourage in your own workplace?",
  ];

  if (
    themeNames.some((theme) =>
      ["leadership", "supervision", "training", "induction"].some((keyword) =>
        theme.includes(keyword),
      ),
    )
  ) {
    prompts.push("What role did supervision or leadership play?");
  }

  if (
    themeNames.some((theme) =>
      [
        "communication",
        "reporting",
        "speaking up",
        "psychological safety",
      ].some((keyword) => theme.includes(keyword)),
    )
  ) {
    prompts.push("Would an intern feel safe speaking up in these situations?");
  }

  const fallbackPrompts = [
    "What role did supervision or leadership play?",
    "Would an intern feel safe speaking up in these situations?",
  ];

  for (const prompt of fallbackPrompts) {
    if (prompts.length >= 4) {
      break;
    }

    if (!prompts.includes(prompt)) {
      prompts.push(prompt);
    }
  }

  return prompts.slice(0, 4);
}

function calculatePercentage(count: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((count / total) * 100);
}

function formatThemeLabel(theme: string) {
  return theme
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
