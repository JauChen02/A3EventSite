"use client";

import { createClient } from "@supabase/supabase-js";
import { getRequiredPublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

export function createSupabaseBrowserClient() {
  return createClient<Database>(
    getRequiredPublicEnv("supabaseUrl"),
    getRequiredPublicEnv("supabaseAnonKey"),
  );
}
