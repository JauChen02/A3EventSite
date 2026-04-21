import "server-only";

// Server environment values only. Import this helper from route handlers,
// server components, or server-side library files.
// Never import this file from a "use client" module.

export const serverEnv = {
  get openaiApiKey() {
    return getRequiredServerEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
  },
  get supabaseServiceRoleKey() {
    return getRequiredServerEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
} as const;

function getRequiredServerEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}
