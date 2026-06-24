import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import process from "node:process";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Creates a Supabase client scoped to the current user's session by reading
// their auth cookies from the incoming request. Used for auth checks in server functions.
export function getSupabaseUserClient(request: Request) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_ANON_KEY!;
  const cookieHeader = request.headers.get("cookie") ?? "";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieHeader.split("; ").filter(Boolean).map((pair) => {
          const idx = pair.indexOf("=");
          return idx === -1
            ? { name: pair, value: "" }
            : { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
        });
      },
      setAll() {},
    },
  });
}
