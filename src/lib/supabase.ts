import { createClient } from "@supabase/supabase-js";

// Browser-safe Supabase client — uses the public anon key only.
// Never import supabase.server.ts here (service role key would leak to the bundle).
export function getSupabaseBrowser() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
  }
  return createClient(url, key);
}
