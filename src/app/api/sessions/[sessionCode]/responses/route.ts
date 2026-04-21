import { NextResponse } from "next/server";
import { validateSessionCode } from "@/lib/api-validation";
import {
  listLocalSessionResponses,
  shouldUseLocalDataStore,
} from "@/lib/local-dev-backend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SessionResponsesRouteContext = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: SessionResponsesRouteContext,
) {
  const { sessionCode } = await params;
  const validSessionCode = validateSessionCode(sessionCode);

  if (!validSessionCode.ok) {
    return NextResponse.json({ error: validSessionCode.message }, { status: 400 });
  }

  try {
    if (shouldUseLocalDataStore()) {
      const responses = await listLocalSessionResponses(validSessionCode.value);

      return NextResponse.json({
        sessionCode: validSessionCode.value,
        count: responses.length,
        responses,
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("safety_responses")
      .select("*")
      .eq("session_code", validSessionCode.value)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load session responses.", error);
      return NextResponse.json(
        { error: "Could not load session responses right now." },
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
          "The presenter data service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}
