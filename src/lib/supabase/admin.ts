import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getRequiredPublicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "@/lib/types";

export function createSupabaseAdminClient() {
  return createClient<Database>(
    getRequiredPublicEnv("supabaseUrl"),
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
