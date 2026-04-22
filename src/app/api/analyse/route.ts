import { NextResponse } from "next/server";
import { APIError } from "openai";
import { validateSessionCode } from "@/lib/api-validation";
import {
  analyseObservationLocally,
  insertLocalAnalysedResponse,
  shouldUseLocalAnalysis,
  shouldUseLocalDataStore,
} from "@/lib/local-dev-backend";
import { createOpenAIClient } from "@/lib/openai";
import { SAFETY_CULTURE_ACTIONS } from "@/lib/safety-culture-actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  SafetyAnalysisResult,
  SafetyIndicator,
  SafetyResponseInsert,
} from "@/lib/types";

export const runtime = "nodejs";

const MAX_OBSERVATION_LENGTH = 1500;
const OPENAI_MODEL = "gpt-4o-mini";

const ANALYSIS_INSTRUCTIONS = `You are a workplace safety culture reflection assistant for internship students.
Analyse anonymised workplace observations and turn them into structured safety culture discussion points.
Do not provide legal advice, formal safety rulings, or incident investigation findings.
This is for educational discussion only.
Use discussion-oriented, non-authoritative language such as "could discuss", "might help", or "consider".
Do not sound like a legal notice, compliance ruling, or formal safety directive.
Classify the observation as positive, negative, or mixed.
Focus on hazard reporting, speaking up, supervision, induction, training, PPE, risk controls, leadership behaviour, communication, workload pressure, near-miss reporting, psychological safety, and policy versus actual practice.
Avoid blaming individuals. Focus on systems, culture, communication, and workplace practice.
If the input includes names, company names, exact locations, or confidential details, create a sanitised summary and remind the user to anonymise details.
Use simple language suitable for engineering and IT internship students.
For safety_culture_action, you MUST choose exactly one of these nine options (use the exact wording):
${SAFETY_CULTURE_ACTIONS.map((a) => `- ${a}`).join("\n")}`;

const analysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sanitised_summary",
    "indicator",
    "safety_culture_action",
    "reason",
    "proposed_action_needed",
    "proposed_action",
    "discussion_question",
    "privacy_reminder",
    "themes",
  ],
  properties: {
    sanitised_summary: {
      type: "string",
      description:
        "A privacy-preserving summary that removes names, company names, exact locations, and confidential details.",
    },
    indicator: {
      type: "string",
      enum: ["positive", "negative", "mixed"],
    },
    safety_culture_action: {
      type: "string",
      enum: SAFETY_CULTURE_ACTIONS,
      description:
        "The single most relevant safety culture action from the nine defined options.",
    },
    reason: {
      type: "string",
      description:
        "A short explanation of why the observation was classified this way.",
    },
    proposed_action_needed: {
      type: "boolean",
    },
    proposed_action: {
      type: "string",
      description:
        "A practical, education-focused discussion suggestion phrased without formal legal or safety authority, or 'No immediate action proposed' when no action is needed.",
    },
    discussion_question: {
      type: "string",
      description: "A classroom discussion question based on the observation.",
    },
    privacy_reminder: {
      type: "string",
      description:
        "A reminder to anonymise details if the observation may contain identifying or confidential information.",
    },
    themes: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;

const analysisResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "safety_culture_analysis",
    description:
      "Structured analysis of an anonymised workplace safety culture observation for classroom discussion.",
    strict: true,
    schema: analysisJsonSchema,
  },
} as const;

type AnalyseRequestBody = {
  sessionCode?: unknown;
  observation?: unknown;
};

type ValidationResult =
  | {
      ok: true;
      sessionCode: string;
      observation: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (!body.ok) {
    return errorResponse(body.message, 400);
  }

  const validation = validateAnalyseRequest(body.data);

  if (!validation.ok) {
    return errorResponse(validation.message, 400);
  }

  try {
    const analysis = await analyseObservation(validation.observation);
    const savedResponse = await saveAnalysis({
      sessionCode: validation.sessionCode,
      observation: validation.observation,
      analysis,
    });

    return NextResponse.json(savedResponse, { status: 201 });
  } catch (error) {
    return handleAnalyseError(error);
  }
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: AnalyseRequestBody } | { ok: false; message: string }> {
  try {
    const data = (await request.json()) as AnalyseRequestBody;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        ok: false,
        message: "Request body must be a JSON object.",
      };
    }

    return { ok: true, data };
  } catch {
    return {
      ok: false,
      message: "Request body must be valid JSON.",
    };
  }
}

function validateAnalyseRequest(body: AnalyseRequestBody): ValidationResult {
  if (typeof body.sessionCode !== "string") {
    return {
      ok: false,
      message: "sessionCode is required.",
    };
  }

  if (typeof body.observation !== "string") {
    return {
      ok: false,
      message: "observation is required.",
    };
  }

  const sessionCode = body.sessionCode.trim();
  const observation = body.observation.trim();
  const sessionCodeValidation = validateSessionCode(sessionCode);

  if (!sessionCodeValidation.ok) {
    return {
      ok: false,
      message: sessionCodeValidation.message,
    };
  }

  if (!observation) {
    return {
      ok: false,
      message: "observation cannot be empty.",
    };
  }

  if (observation.length > MAX_OBSERVATION_LENGTH) {
    return {
      ok: false,
      message: `observation must be ${MAX_OBSERVATION_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    sessionCode: sessionCodeValidation.value,
    observation,
  };
}

async function analyseObservation(observation: string) {
  if (shouldUseLocalAnalysis()) {
    return analyseObservationLocally(observation);
  }

  const openai = createOpenAIClient();

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: ANALYSIS_INSTRUCTIONS },
      { role: "user", content: `Observation:\n${observation}` },
    ],
    max_completion_tokens: 900,
    response_format: analysisResponseFormat,
  });

  const outputText = response.choices[0]?.message?.content;

  if (!outputText) {
    throw new AnalyseRouteError(
      "OpenAI returned an empty analysis response.",
      502,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new AnalyseRouteError(
      "OpenAI returned analysis that was not valid JSON.",
      502,
    );
  }

  if (!isSafetyAnalysisResult(parsed)) {
    throw new AnalyseRouteError(
      "OpenAI returned analysis in an unexpected format.",
      502,
    );
  }

  return normalizeAnalysis(parsed);
}

async function saveAnalysis({
  sessionCode,
  observation,
  analysis,
}: {
  sessionCode: string;
  observation: string;
  analysis: SafetyAnalysisResult;
}) {
  if (shouldUseLocalDataStore()) {
    return insertLocalAnalysedResponse({
      sessionCode,
      observation,
      analysis,
    });
  }

  const supabase = createSupabaseAdminClient();
  const insertPayload: SafetyResponseInsert = {
    session_code: sessionCode,
    original_observation: observation,
    sanitised_summary: analysis.sanitised_summary,
    indicator: analysis.indicator,
    safety_culture_action: analysis.safety_culture_action,
    reason: analysis.reason,
    proposed_action_needed: analysis.proposed_action_needed,
    proposed_action: analysis.proposed_action,
    discussion_question: analysis.discussion_question,
    privacy_reminder: analysis.privacy_reminder,
    themes: analysis.themes,
  };

  const { data, error } = await supabase
    .from("safety_responses")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new AnalyseRouteError(
      "Could not save the analysed response.",
      500,
      error,
    );
  }

  return data;
}

function isSafetyAnalysisResult(value: unknown): value is SafetyAnalysisResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.sanitised_summary) &&
    isSafetyIndicator(value.indicator) &&
    isNonEmptyString(value.safety_culture_action) &&
    isNonEmptyString(value.reason) &&
    typeof value.proposed_action_needed === "boolean" &&
    isNonEmptyString(value.proposed_action) &&
    isNonEmptyString(value.discussion_question) &&
    isNonEmptyString(value.privacy_reminder) &&
    Array.isArray(value.themes) &&
    value.themes.every((theme) => typeof theme === "string")
  );
}

function normalizeAnalysis(analysis: SafetyAnalysisResult): SafetyAnalysisResult {
  return {
    sanitised_summary: analysis.sanitised_summary.trim(),
    indicator: analysis.indicator,
    safety_culture_action: analysis.safety_culture_action.trim(),
    reason: analysis.reason.trim(),
    proposed_action_needed: analysis.proposed_action_needed,
    proposed_action: analysis.proposed_action.trim(),
    discussion_question: analysis.discussion_question.trim(),
    privacy_reminder: analysis.privacy_reminder.trim(),
    themes: analysis.themes
      .map((theme) => theme.trim())
      .filter((theme, index, themes) => theme && themes.indexOf(theme) === index),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafetyIndicator(value: unknown): value is SafetyIndicator {
  return value === "positive" || value === "negative" || value === "mixed";
}

function handleAnalyseError(error: unknown) {
  if (error instanceof AnalyseRouteError) {
    console.error(error.logMessage, error.cause);
    return errorResponse(error.message, error.status);
  }

  if (isMissingEnvironmentError(error)) {
    console.error(error);
    return errorResponse(
      "The response-saving service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      500,
    );
  }

  if (error instanceof APIError) {
    console.error("OpenAI Responses API request failed.", {
      status: error.status,
      name: error.name,
      requestId: error.requestID,
    });

    return errorResponse("AI analysis service is unavailable.", 502);
  }

  console.error(error);

  return errorResponse(
    "Could not analyse the observation right now. Please try again in a moment.",
    500,
  );
}

function isMissingEnvironmentError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("Missing required") &&
    error.message.includes("environment variable")
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

class AnalyseRouteError extends Error {
  readonly logMessage: string;
  readonly status: number;

  constructor(message: string, status: number, cause?: unknown) {
    super(message);
    this.name = "AnalyseRouteError";
    this.status = status;
    this.cause = cause;
    this.logMessage = message;
  }
}
