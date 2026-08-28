import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getAppSharedPassword(): string {
  return requireEnv("APP_SHARED_PASSWORD");
}

export function getSessionSecret(): string {
  return requireEnv("SESSION_SECRET");
}

export function getSupabaseUrl(): string {
  return requireEnv("SUPABASE_URL");
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
