import { runtimeEnv } from "@/lib/runtime-env";

export function getSupabaseStatus() {
  return {
    configured: Boolean(runtimeEnv.SUPABASE_URL && runtimeEnv.SUPABASE_ANON_KEY),
    urlConfigured: Boolean(runtimeEnv.SUPABASE_URL),
    anonKeyConfigured: Boolean(runtimeEnv.SUPABASE_ANON_KEY),
    serviceRoleConfigured: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { accessToken?: string; serviceRole?: boolean } = {},
) {
  const url = runtimeEnv.SUPABASE_URL;
  const key = options.serviceRole ? runtimeEnv.SUPABASE_SERVICE_ROLE_KEY : runtimeEnv.SUPABASE_ANON_KEY;
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
