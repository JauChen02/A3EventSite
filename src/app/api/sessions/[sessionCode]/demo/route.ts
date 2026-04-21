import { NextResponse } from "next/server";
import { validateSessionCode } from "@/lib/api-validation";
import {
  insertLocalResponses,
  shouldUseLocalDataStore,
} from "@/lib/local-dev-backend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SafetyResponseInsert } from "@/lib/types";

type DemoSessionRouteContext = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export async function POST(
  _request: Request,
  { params }: DemoSessionRouteContext,
) {
  const { sessionCode } = await params;
  const validSessionCode = validateSessionCode(sessionCode);

  if (!validSessionCode.ok) {
    return NextResponse.json({ error: validSessionCode.message }, { status: 400 });
  }

  try {
    const demoResponses = buildDemoResponses(validSessionCode.value);

    if (shouldUseLocalDataStore()) {
      const responses = await insertLocalResponses(demoResponses);

      return NextResponse.json({
        loaded: true,
        sessionCode: validSessionCode.value,
        insertedCount: responses.length,
        responses,
      });
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("safety_responses")
      .insert(demoResponses)
      .select();

    if (error) {
      console.error("Could not load demo responses.", error);
      return NextResponse.json(
        { error: "Could not load demo responses right now." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      loaded: true,
      sessionCode: validSessionCode.value,
      insertedCount: data.length,
      responses: data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "The demo data service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}

function buildDemoResponses(sessionCode: string): SafetyResponseInsert[] {
  return [
    {
      session_code: sessionCode,
      original_observation:
        "At the start of my placement, the team leader gave every new person a safety induction, explained emergency exits, reporting channels, PPE requirements, and checked our understanding before we started work.",
      sanitised_summary:
        "A supervisor provided a clear induction, safety briefing, and checked that new starters understood key procedures before work began.",
      indicator: "positive",
      safety_culture_action: "Strong induction and safety briefing",
      reason:
        "The workplace set clear expectations early and showed that safety information mattered before productivity started.",
      proposed_action_needed: true,
      proposed_action:
        "Consider keeping this approach by using consistent inductions and short supervisor check-ins for new starters.",
      discussion_question:
        "What made this induction feel like a real safety practice rather than a box-ticking exercise?",
      privacy_reminder:
        "Keep workplace names, team names, and site details anonymous when discussing this example.",
      themes: ["induction", "training", "leadership", "communication"],
    },
    {
      session_code: sessionCode,
      original_observation:
        "A walkway near an exit had boxes and equipment left in it for most of the day, and people had to squeeze around it even though it was supposed to stay clear.",
      sanitised_summary:
        "A blocked walkway or fire exit remained obstructed during normal work, making access and movement less safe.",
      indicator: "negative",
      safety_culture_action: "Unsafe housekeeping around exits and walkways",
      reason:
        "The example suggests that everyday convenience was prioritised over keeping essential access routes clear.",
      proposed_action_needed: true,
      proposed_action:
        "Consider reinforcing shared responsibility for keeping walkways and exits clear, with faster follow-up when obstructions appear.",
      discussion_question:
        "What does it suggest about safety culture when blocked access routes are treated as normal?",
      privacy_reminder:
        "Remove site-specific layout details and any workplace identifiers before sharing similar examples.",
      themes: ["risk controls", "housekeeping", "leadership", "policy versus practice"],
    },
    {
      session_code: sessionCode,
      original_observation:
        "The workplace had gloves, glasses, and signs about PPE, but people used them differently depending on who was supervising and how busy the shift was.",
      sanitised_summary:
        "PPE was available and visible, but actual use was inconsistent across the team.",
      indicator: "mixed",
      safety_culture_action: "PPE availability without consistent practice",
      reason:
        "The workplace had the equipment and rules in place, but everyday behaviour did not fully match the expected standard.",
      proposed_action_needed: true,
      proposed_action:
        "Consider pairing PPE availability with regular reminders, visible role modelling, and follow-up when use drops during busy periods.",
      discussion_question:
        "Why might a workplace provide PPE but still struggle to make its use consistent?",
      privacy_reminder:
        "Avoid naming teams, shifts, or workplaces when describing examples like this.",
      themes: ["ppe", "supervision", "leadership", "policy versus practice"],
    },
    {
      session_code: sessionCode,
      original_observation:
        "After a small near miss, the team talked about what happened straight away, logged it, and discussed how to prevent it next time without blaming the person involved.",
      sanitised_summary:
        "A near miss was reported openly and used as a learning opportunity without blame.",
      indicator: "positive",
      safety_culture_action: "Healthy near-miss reporting and learning",
      reason:
        "The response showed psychological safety, openness, and a focus on improving the system rather than blaming an individual.",
      proposed_action_needed: true,
      proposed_action:
        "Consider keeping this learning-focused response by normalising near-miss discussion and follow-up improvements.",
      discussion_question:
        "What helped this near-miss become a learning moment rather than a blame moment?",
      privacy_reminder:
        "Do not include names, incident identifiers, or detailed client information when discussing near misses.",
      themes: ["near-miss reporting", "psychological safety", "communication", "learning"],
    },
    {
      session_code: sessionCode,
      original_observation:
        "When deadlines became tight, some staff skipped parts of the normal process and there was pressure to finish quickly rather than raise concerns or slow down.",
      sanitised_summary:
        "Time pressure encouraged people to rush work and treat safety steps as secondary to speed.",
      indicator: "negative",
      safety_culture_action: "Workload pressure undermining safe practice",
      reason:
        "The example suggests that production pressure made it harder for people to pause, question risks, or follow normal controls.",
      proposed_action_needed: true,
      proposed_action:
        "Consider discussing how supervisors can respond to time pressure without signalling that safety steps should be shortened or skipped.",
      discussion_question:
        "How can deadline pressure change whether interns feel safe to speak up or slow down work?",
      privacy_reminder:
        "Keep project names, client names, and exact workplace details anonymous.",
      themes: ["workload pressure", "speaking up", "leadership", "risk controls"],
    },
    {
      session_code: sessionCode,
      original_observation:
        "In the office area, some people had adjustable chairs and screens, but others were working for long periods on laptops without proper setup until they asked for help.",
      sanitised_summary:
        "Some staff had ergonomic support in the office, but workstation setup was inconsistent and depended on whether people asked for help.",
      indicator: "mixed",
      safety_culture_action: "Partial ergonomic support in an office and IT setting",
      reason:
        "There was evidence of awareness and available adjustments, but support was not applied consistently across the workplace.",
      proposed_action_needed: true,
      proposed_action:
        "Consider proactive workstation checks so ergonomic support does not rely only on individuals noticing a problem and speaking up.",
      discussion_question:
        "What would make ergonomic setup feel like a normal workplace practice instead of something people request only after discomfort starts?",
      privacy_reminder:
        "Avoid naming office locations, teams, or identifiable workplace layouts.",
      themes: ["ergonomics", "office safety", "speaking up", "supervision"],
    },
  ];
}
