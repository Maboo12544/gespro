import { getSupabaseStatus } from "@/lib/supabase/server";

export async function GET() {
  return Response.json(getSupabaseStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
