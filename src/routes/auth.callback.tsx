import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.location.replace("/box");
      });
    } else {
      window.location.replace("/signin");
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Completing sign in…</p>
    </div>
  );
}
