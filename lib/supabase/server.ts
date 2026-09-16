import { env } from "cloudflare:workers";

export function getSupabaseStatus() {
  return {
    configured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    urlConfigured: Boolean(env.SUPABASE_URL),
    anonKeyConfigured: Boolean(env.SUPABASE_ANON_KEY),
    serviceRoleConfigured: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { accessToken?: string; serviceRole?: boolean } = {},
) {
  const url = env.SUPABASE_URL;
  const key = options.serviceRole ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");

  const response = await fetch(`${url.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${options.accessToken ?? key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`SUPABASE_REQUEST_FAILED:${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
