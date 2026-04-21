// Public environment values only. This file is safe to import from client code.
// Do not add OPENAI_API_KEY or SUPABASE_SERVICE_ROLE_KEY here.

export const publicEnv = {
  appUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

export type PublicEnvKey = keyof typeof publicEnv;

export function getRequiredPublicEnv(key: PublicEnvKey) {
  const value = publicEnv[key];

  if (!value) {
    throw new Error(`Missing required public environment variable: ${key}`);
  }

  return value;
}

export function buildPublicAppUrl(path: string) {
  return buildPublicAppUrlWithOrigin(path);
}

export function buildPublicAppUrlWithOrigin(
  path: string,
  fallbackOrigin?: string,
) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = normalizeBaseUrl(fallbackOrigin ?? "");

  if (!publicEnv.appUrl) {
    return origin ? `${origin}${normalizedPath}` : normalizedPath;
  }

  return `${publicEnv.appUrl}${normalizedPath}`;
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}
