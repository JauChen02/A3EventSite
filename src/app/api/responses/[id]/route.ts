import { NextResponse } from "next/server";
import { validateResponseId } from "@/lib/api-validation";
import {
  deleteLocalResponse,
  shouldUseLocalDataStore,
  updateLocalResponse,
} from "@/lib/local-dev-backend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SafetyResponseUpdate } from "@/lib/types";

type ResponseRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: ResponseRouteContext,
) {
  const { id } = await params;
  const responseId = validateResponseId(id);

  if (!responseId.ok) {
    return NextResponse.json({ error: responseId.message }, { status: 400 });
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: body.message }, { status: 400 });
  }

  const update = validateModerationUpdate(body.data);

  if (!update.ok) {
    return NextResponse.json({ error: update.message }, { status: 400 });
  }

  try {
    if (shouldUseLocalDataStore()) {
      const response = await updateLocalResponse(responseId.value, update.data);

      if (!response) {
        return NextResponse.json(
          { error: "Response not found.", id: responseId.value },
          { status: 404 },
        );
      }

      return NextResponse.json({ response });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("safety_responses")
      .update(update.data)
      .eq("id", responseId.value)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Could not update response.", error);
      return NextResponse.json(
        { error: "Could not update the response right now." },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Response not found.", id: responseId.value },
        { status: 404 },
      );
    }

    return NextResponse.json({ response: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "The moderation service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: ResponseRouteContext,
) {
  const { id } = await params;
  const responseId = validateResponseId(id);

  if (!responseId.ok) {
    return NextResponse.json({ error: responseId.message }, { status: 400 });
  }

  try {
    if (shouldUseLocalDataStore()) {
      const deleted = await deleteLocalResponse(responseId.value);

      if (!deleted) {
        return NextResponse.json(
          { error: "Response not found.", id: responseId.value },
          { status: 404 },
        );
      }

      return NextResponse.json({ deleted: true, id: responseId.value });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("safety_responses")
      .delete()
      .eq("id", responseId.value)
      .select("id");

    if (error) {
      console.error("Could not delete response.", error);
      return NextResponse.json(
        { error: "Could not delete the response right now." },
        { status: 500 },
      );
    }

    if (!data.length) {
      return NextResponse.json(
        { error: "Response not found.", id: responseId.value },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true, id: responseId.value });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          "The moderation service is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }
}

type ModerationRequestBody = {
  is_visible?: unknown;
  is_pinned?: unknown;
};

async function readJsonBody(
  request: Request,
): Promise<
  { ok: true; data: ModerationRequestBody } | { ok: false; message: string }
> {
  try {
    const data = (await request.json()) as ModerationRequestBody;

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

function validateModerationUpdate(
  body: ModerationRequestBody,
):
  | { ok: true; data: Pick<SafetyResponseUpdate, "is_visible" | "is_pinned"> }
  | { ok: false; message: string } {
  const update: Pick<SafetyResponseUpdate, "is_visible" | "is_pinned"> = {};

  if ("is_visible" in body) {
    if (typeof body.is_visible !== "boolean") {
      return {
        ok: false,
        message: "is_visible must be a boolean.",
      };
    }

    update.is_visible = body.is_visible;
  }

  if ("is_pinned" in body) {
    if (typeof body.is_pinned !== "boolean") {
      return {
        ok: false,
        message: "is_pinned must be a boolean.",
      };
    }

    update.is_pinned = body.is_pinned;
  }

  if (!("is_visible" in update) && !("is_pinned" in update)) {
    return {
      ok: false,
      message: "Provide is_visible or is_pinned to update.",
    };
  }

  return { ok: true, data: update };
}
