import { NextResponse } from "next/server";
import { validateSessionCode } from "@/lib/api-validation";
import {
  listLocalWallResponses,
  shouldUseLocalDataStore,
} from "@/lib/local-dev-backend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type WallResponsesRouteContext = {
  params: Promise<{
    sessionCode: string;
  }>;
};

const wallSelectColumns = [
  "id",
  "sanitised_summary",
  "indicator",
  "safety_culture_action",
  "reason",
  "discussion_question",
  "themes",
  "is_pinned",
].join(",");

export async function GET(
  _request: Request,
  { params }: WallResponsesRouteContext,
) {
  const { sessionCode } = await params;
  const validSessionCode = validateSessionCode(sessionCode);

  if (!validSessionCode.ok) {
    return NextResponse.json({ error: validSessionCode.message }, { status: 400 });
  }

  try {
    if (shouldUseLocalDataStore()) {
      const responses = await listLocalWallResponses(validSessionCode.value);

      return NextResponse.json({
        sessionCode: validSessionCode.value,
        count: responses.length,
        responses,
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("safety_responses")
      .select(wallSelectColumns)
      .eq("session_code", validSessionCode.value)
      .eq("is_visible", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load wall responses.", error);
      return NextResponse.json(
        { error: "Could not load wall responses right now." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sessionCode: validSessionCode.value,
      count: data.length,
      responses: data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "The wall data service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}
