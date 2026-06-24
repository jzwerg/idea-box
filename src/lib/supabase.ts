import { createBrowserClient } from "@supabase/ssr";

// Browser-safe Supabase client — uses cookie-based storage so the session
// is readable by server functions. Never import supabase.server.ts here.
export function getSupabaseBrowser() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
  }
  return createBrowserClient(url, key);
}
