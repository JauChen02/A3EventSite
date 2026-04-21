import { NextResponse } from "next/server";
import { validateSessionCode } from "@/lib/api-validation";
import {
  clearLocalSessionResponses,
  shouldUseLocalDataStore,
} from "@/lib/local-dev-backend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ClearSessionRouteContext = {
  params: Promise<{
    sessionCode: string;
  }>;
};

export async function DELETE(
  _request: Request,
  { params }: ClearSessionRouteContext,
) {
  const { sessionCode } = await params;
  const validSessionCode = validateSessionCode(sessionCode);

  if (!validSessionCode.ok) {
    return NextResponse.json({ error: validSessionCode.message }, { status: 400 });
  }

  try {
    if (shouldUseLocalDataStore()) {
      const deletedCount = await clearLocalSessionResponses(
        validSessionCode.value,
      );

      return NextResponse.json({
        cleared: true,
        sessionCode: validSessionCode.value,
        deletedCount,
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("safety_responses")
      .delete()
      .eq("session_code", validSessionCode.value)
      .select("id");

    if (error) {
      console.error("Could not clear session responses.", error);
      return NextResponse.json(
        { error: "Could not clear this session right now." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      cleared: true,
      sessionCode: validSessionCode.value,
      deletedCount: data.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "The session management service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}
