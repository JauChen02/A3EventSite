import "server-only";

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SAFETY_CULTURE_ACTIONS } from "@/lib/safety-culture-actions";
import type {
  SafetyAnalysisResult,
  SafetyIndicator,
  SafetyResponse,
  SafetyResponseInsert,
  SafetyResponseUpdate,
  WallSafetyResponse,
} from "@/lib/types";

const LOCAL_DEV_DIRECTORY = path.join(process.cwd(), ".local-dev");
const LOCAL_DEV_STORE_PATH = path.join(
  LOCAL_DEV_DIRECTORY,
  "safety-responses.json",
);
const LOCAL_STORE_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const LOCAL_ANALYSIS_ENV_NAMES = ["OPENAI_API_KEY"] as const;

type LocalStore = {
  responses: SafetyResponse[];
};

type LocalStoreResponseInsert = {
  sessionCode: string;
  observation: string;
  analysis: SafetyAnalysisResult;
};

type ThemeConfig = {
  theme: string;
  keywords: string[];
  action: string;
  prompts: string[];
};

const themeConfigs: ThemeConfig[] = [
  {
    theme: "induction",
    keywords: ["induction", "onboarding", "briefing", "new starter"],
    action: SAFETY_CULTURE_ACTIONS[2], // Clarify Required Behaviours
    prompts: [
      "What made this induction feel useful in practice?",
      "How can a team keep a strong induction standard for new starters?",
    ],
  },
  {
    theme: "hazard reporting",
    keywords: ["hazard", "reported", "reporting", "raised", "followed up"],
    action: SAFETY_CULTURE_ACTIONS[6], // Increase Hazard/Risk Awareness
    prompts: [
      "Would an intern feel confident reporting a hazard in this situation?",
      "What happened after the concern was raised, and what does that suggest about safety culture?",
    ],
  },
  {
    theme: "near-miss reporting",
    keywords: ["near miss", "near-miss", "almost", "learning"],
    action: SAFETY_CULTURE_ACTIONS[8], // Monitor, Review & Reflect
    prompts: [
      "What role did psychological safety play in whether the near miss was discussed openly?",
      "How can near misses become learning opportunities instead of blame moments?",
    ],
  },
  {
    theme: "ppe",
    keywords: ["ppe", "gloves", "glasses", "helmet", "hi-vis", "mask"],
    action: SAFETY_CULTURE_ACTIONS[5], // Engage & Own Responsibilities
    prompts: [
      "Why might PPE be available but still used inconsistently?",
      "What practice would help PPE expectations feel normal across the team?",
    ],
  },
  {
    theme: "supervision",
    keywords: ["supervisor", "manager", "team leader", "lead", "oversight"],
    action: SAFETY_CULTURE_ACTIONS[1], // Demonstrate Leadership Motive
    prompts: [
      "What role did supervision or leadership play here?",
      "How much difference does visible follow-up from a supervisor make?",
    ],
  },
  {
    theme: "training",
    keywords: ["training", "explained", "shown", "demonstrated", "coach"],
    action: SAFETY_CULTURE_ACTIONS[7], // Improve Safety Management Knowledge
    prompts: [
      "Was the training enough to support safe work in practice?",
      "What turns safety training into a real habit rather than a one-off message?",
    ],
  },
  {
    theme: "risk controls",
    keywords: ["control", "barrier", "walkway", "exit", "blocked", "obstructed"],
    action: SAFETY_CULTURE_ACTIONS[6], // Increase Hazard/Risk Awareness
    prompts: [
      "What does this example suggest about policy versus actual practice?",
      "How do small control failures shape safety culture over time?",
    ],
  },
  {
    theme: "leadership",
    keywords: ["leadership", "leaders", "tone", "role model", "example"],
    action: SAFETY_CULTURE_ACTIONS[1], // Demonstrate Leadership Motive
    prompts: [
      "What did leadership signal about what mattered most here?",
      "How do leader actions influence whether people speak up?",
    ],
  },
  {
    theme: "communication",
    keywords: ["communication", "talked", "discussed", "explained", "clarity"],
    action: SAFETY_CULTURE_ACTIONS[0], // Communicate Company Values
    prompts: [
      "What made the communication effective or ineffective here?",
      "How would clearer communication change the outcome?",
    ],
  },
  {
    theme: "workload pressure",
    keywords: ["rush", "deadline", "pressure", "busy", "time pressure", "speed"],
    action: SAFETY_CULTURE_ACTIONS[4], // Develop Positive Safety Attitudes
    prompts: [
      "How did time pressure affect whether people felt safe to slow down or speak up?",
      "What would help a team protect safety when deadlines become tight?",
    ],
  },
  {
    theme: "psychological safety",
    keywords: ["speak up", "speaking up", "comfortable", "afraid", "blame"],
    action: SAFETY_CULTURE_ACTIONS[4], // Develop Positive Safety Attitudes
    prompts: [
      "Would an intern feel safe speaking up in this situation?",
      "What signs tell us whether people expect blame or support?",
    ],
  },
  {
    theme: "policy versus practice",
    keywords: ["supposed to", "in practice", "actually", "rule", "policy", "inconsistent"],
    action: SAFETY_CULTURE_ACTIONS[2], // Clarify Required Behaviours
    prompts: [
      "What made this feel different from the official rule or policy?",
      "Where do you see the gap between policy and practice in this example?",
    ],
  },
  {
    theme: "ergonomics",
    keywords: ["ergonomic", "chair", "desk", "screen", "monitor", "laptop", "posture"],
    action: SAFETY_CULTURE_ACTIONS[3], // Personalise Safety Outcomes
    prompts: [
      "What would make ergonomic support feel like a normal part of work here?",
      "How much should people need to ask before workstation issues are addressed?",
    ],
  },
];

const positiveKeywords = [
  "clear",
  "supported",
  "checked",
  "encouraged",
  "openly",
  "available",
  "understood",
  "briefing",
  "induction",
  "training",
  "followed up",
  "listened",
  "safe to",
];

const negativeKeywords = [
  "ignored",
  "blocked",
  "obstructed",
  "rushed",
  "pressure",
  "skipped",
  "inconsistent",
  "unsafe",
  "afraid",
  "delayed",
  "no one",
  "missing",
  "unclear",
  "days",
];

export function shouldUseLocalDataStore() {
  return shouldUseLocalFallback(LOCAL_STORE_ENV_NAMES);
}

export function shouldUseLocalAnalysis() {
  return LOCAL_ANALYSIS_ENV_NAMES.some((envName) => !process.env[envName]);
}

export async function insertLocalAnalysedResponse({
  sessionCode,
  observation,
  analysis,
}: LocalStoreResponseInsert) {
  const store = await readStore();
  const response = createStoredResponse({
    sessionCode,
    observation,
    analysis,
  });

  store.responses.push(response);
  await writeStore(store);

  return response;
}

export async function insertLocalResponses(responses: SafetyResponseInsert[]) {
  const store = await readStore();
  const insertedResponses = responses.map((response) =>
    createStoredResponse({
      sessionCode: response.session_code,
      observation: response.original_observation ?? "",
      analysis: {
        sanitised_summary: response.sanitised_summary,
        indicator: response.indicator,
        safety_culture_action: response.safety_culture_action,
        reason: response.reason,
        proposed_action_needed: response.proposed_action_needed ?? false,
        proposed_action: response.proposed_action,
        discussion_question: response.discussion_question,
        privacy_reminder: response.privacy_reminder,
        themes: response.themes ?? [],
      },
      createdAt: response.created_at,
      id: response.id,
      isPinned: response.is_pinned,
      isVisible: response.is_visible,
    }),
  );

  store.responses.push(...insertedResponses);
  await writeStore(store);

  return sortResponses(insertedResponses);
}

export async function listLocalSessionResponses(sessionCode: string) {
  const store = await readStore();

  return sortResponses(
    store.responses.filter((response) => response.session_code === sessionCode),
  );
}

export async function listLocalWallResponses(sessionCode: string) {
  const responses = await listLocalSessionResponses(sessionCode);

  return responses
    .filter((response) => response.is_visible)
    .map((response): WallSafetyResponse => toWallResponse(response));
}

export async function updateLocalResponse(
  id: string,
  update: Pick<SafetyResponseUpdate, "is_visible" | "is_pinned">,
) {
  const store = await readStore();
  const responseIndex = store.responses.findIndex((response) => response.id === id);

  if (responseIndex === -1) {
    return null;
  }

  const existingResponse = store.responses[responseIndex];
  const updatedResponse: SafetyResponse = {
    ...existingResponse,
    ...(typeof update.is_visible === "boolean"
      ? { is_visible: update.is_visible }
      : {}),
    ...(typeof update.is_pinned === "boolean"
      ? { is_pinned: update.is_pinned }
      : {}),
  };

  store.responses[responseIndex] = updatedResponse;
  await writeStore(store);

  return updatedResponse;
}

export async function deleteLocalResponse(id: string) {
  const store = await readStore();
  const remainingResponses = store.responses.filter((response) => response.id !== id);

  if (remainingResponses.length === store.responses.length) {
    return false;
  }

  store.responses = remainingResponses;
  await writeStore(store);

  return true;
}

export async function clearLocalSessionResponses(sessionCode: string) {
  const store = await readStore();
  const deletedCount = store.responses.filter(
    (response) => response.session_code === sessionCode,
  ).length;

  if (deletedCount === 0) {
    return 0;
  }

  store.responses = store.responses.filter(
    (response) => response.session_code !== sessionCode,
  );
  await writeStore(store);

  return deletedCount;
}

export function analyseObservationLocally(
  observation: string,
): SafetyAnalysisResult {
  const lowerCaseObservation = observation.toLowerCase();
  const themes = extractThemes(lowerCaseObservation);
  const indicator = classifyIndicator(lowerCaseObservation);
  const primaryTheme = getPrimaryThemeConfig(themes);
  const themeLabel = formatThemeLabel(themes);

  return {
    sanitised_summary: buildSanitisedSummary(indicator, themeLabel),
    indicator,
    safety_culture_action: primaryTheme?.action ?? SAFETY_CULTURE_ACTIONS[5], // Engage & Own Responsibilities
    reason: buildReason(indicator, themeLabel),
    proposed_action_needed: indicator !== "positive",
    proposed_action: buildProposedAction(indicator, primaryTheme, themeLabel),
    discussion_question: buildDiscussionQuestion(primaryTheme, indicator),
    privacy_reminder:
      "Keep names, company names, exact locations, and confidential details anonymous when sharing examples like this.",
    themes,
  };
}

function shouldUseLocalFallback(envNames: readonly string[]) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return envNames.some((envName) => !process.env[envName]);
}

async function readStore(): Promise<LocalStore> {
  try {
    const rawStore = await fs.readFile(LOCAL_DEV_STORE_PATH, "utf8");
    const parsedStore = JSON.parse(rawStore) as LocalStore;

    return {
      responses: Array.isArray(parsedStore.responses)
        ? parsedStore.responses
        : [],
    };
  } catch (error) {
    if (isFileMissingError(error)) {
      return {
        responses: [],
      };
    }

    throw error;
  }
}

async function writeStore(store: LocalStore) {
  await fs.mkdir(LOCAL_DEV_DIRECTORY, { recursive: true });

  const temporaryStorePath = `${LOCAL_DEV_STORE_PATH}.tmp`;
  await fs.writeFile(
    temporaryStorePath,
    JSON.stringify(store, null, 2),
    "utf8",
  );
  await fs.rename(temporaryStorePath, LOCAL_DEV_STORE_PATH);
}

function isFileMissingError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function createStoredResponse({
  sessionCode,
  observation,
  analysis,
  createdAt,
  id,
  isPinned,
  isVisible,
}: LocalStoreResponseInsert & {
  createdAt?: string;
  id?: string;
  isPinned?: boolean;
  isVisible?: boolean;
}): SafetyResponse {
  return {
    id: id ?? randomUUID(),
    session_code: sessionCode,
    original_observation: observation,
    sanitised_summary: analysis.sanitised_summary.trim(),
    indicator: analysis.indicator,
    safety_culture_action: analysis.safety_culture_action.trim(),
    reason: analysis.reason.trim(),
    proposed_action_needed: analysis.proposed_action_needed,
    proposed_action: analysis.proposed_action.trim(),
    discussion_question: analysis.discussion_question.trim(),
    privacy_reminder: analysis.privacy_reminder.trim(),
    themes: dedupeThemes(analysis.themes),
    is_visible: isVisible ?? true,
    is_pinned: isPinned ?? false,
    created_at: createdAt ?? new Date().toISOString(),
  };
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

function toWallResponse(response: SafetyResponse): WallSafetyResponse {
  return {
    id: response.id,
    sanitised_summary: response.sanitised_summary,
    indicator: response.indicator,
    safety_culture_action: response.safety_culture_action,
    reason: response.reason,
    discussion_question: response.discussion_question,
    themes: response.themes,
    is_pinned: response.is_pinned,
  };
}

function extractThemes(observation: string) {
  const matchedThemes = themeConfigs
    .filter((themeConfig) =>
      themeConfig.keywords.some((keyword) => hasKeyword(observation, keyword)),
    )
    .map((themeConfig) => themeConfig.theme);

  if (matchedThemes.length === 0) {
    matchedThemes.push("communication", "leadership");
  }

  return dedupeThemes(matchedThemes);
}

function classifyIndicator(observation: string): SafetyIndicator {
  const positiveScore = scoreKeywords(observation, positiveKeywords);
  const negativeScore = scoreKeywords(observation, negativeKeywords);
  const suggestsMixedSignal =
    observation.includes(" but ") ||
    observation.includes(" however ") ||
    observation.includes(" although ") ||
    observation.includes(" while ");

  if (
    (positiveScore > 0 && negativeScore > 0) ||
    (suggestsMixedSignal && positiveScore === negativeScore)
  ) {
    return "mixed";
  }

  if (negativeScore > positiveScore) {
    return "negative";
  }

  if (positiveScore > negativeScore) {
    return suggestsMixedSignal ? "mixed" : "positive";
  }

  return suggestsMixedSignal ? "mixed" : "negative";
}

function scoreKeywords(observation: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    return hasKeyword(observation, keyword) ? score + 1 : score;
  }, 0);
}

function hasKeyword(observation: string, keyword: string) {
  const keywordPattern = escapeRegExp(keyword).replaceAll("\\ ", "\\s+");
  const matcher = new RegExp(`\\b${keywordPattern}\\b`, "i");

  return matcher.test(observation);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeThemes(themes: string[]) {
  return themes
    .map((theme) => theme.trim())
    .filter((theme, index, allThemes) => theme && allThemes.indexOf(theme) === index);
}

function getPrimaryThemeConfig(themes: string[]) {
  return themeConfigs.find((themeConfig) => themes.includes(themeConfig.theme));
}

function formatThemeLabel(themes: string[]) {
  if (themes.length === 0) {
    return "workplace safety culture";
  }

  if (themes.length === 1) {
    return themes[0];
  }

  if (themes.length === 2) {
    return `${themes[0]} and ${themes[1]}`;
  }

  return `${themes[0]}, ${themes[1]}, and related safety culture practices`;
}

function buildSanitisedSummary(
  indicator: SafetyIndicator,
  themeLabel: string,
) {
  switch (indicator) {
    case "positive":
      return `An anonymised observation described a positive example of ${themeLabel} in the workplace.`;
    case "mixed":
      return `An anonymised observation described mixed safety culture signals around ${themeLabel}.`;
    default:
      return `An anonymised observation described concerns about ${themeLabel} in the workplace.`;
  }
}

function buildReason(indicator: SafetyIndicator, themeLabel: string) {
  switch (indicator) {
    case "positive":
      return `The example suggested that ${themeLabel} were supported in a clear and practical way.`;
    case "mixed":
      return `The example showed some support for ${themeLabel}, but everyday practice was not fully consistent.`;
    default:
      return `The example suggested that ${themeLabel} were weakened by day-to-day pressure, gaps, or follow-up issues.`;
  }
}

function buildProposedAction(
  indicator: SafetyIndicator,
  primaryTheme: ThemeConfig | undefined,
  themeLabel: string,
) {
  const discussionFocus = formatDiscussionFocus(primaryTheme, themeLabel);

  if (indicator === "positive") {
    return `No immediate action proposed. Consider discussing how the team could maintain ${discussionFocus} over time.`;
  }

  if (indicator === "mixed") {
    return `Consider discussing what would make ${discussionFocus} more consistent in everyday work, especially when the team is busy.`;
  }

  return `Consider discussing what support, follow-up, or leadership action could strengthen ${discussionFocus} in practice.`;
}

function buildDiscussionQuestion(
  primaryTheme: ThemeConfig | undefined,
  indicator: SafetyIndicator,
) {
  if (primaryTheme) {
    return primaryTheme.prompts[0];
  }

  if (indicator === "positive") {
    return "What made this example feel positive in practice, and how could a team keep that standard?";
  }

  if (indicator === "mixed") {
    return "What made this situation feel mixed rather than clearly positive or negative?";
  }

  return "What role did supervision or leadership play in how this situation unfolded?";
}

function formatDiscussionFocus(
  primaryTheme: ThemeConfig | undefined,
  themeLabel: string,
) {
  if (primaryTheme) {
    return primaryTheme.action.toLowerCase();
  }

  return themeLabel;
}
