import { Auth } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import process from "node:process";

// Auth.js config — add providers here.
// The Supabase adapter persists sessions / users in your Supabase project.
export function getAuthConfig() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return {
    secret: process.env.AUTH_SECRET!,
    providers: [
      ...(process.env.AUTH_GITHUB_ID
        ? [
            GitHub({
              clientId: process.env.AUTH_GITHUB_ID,
              clientSecret: process.env.AUTH_GITHUB_SECRET!,
            }),
          ]
        : []),
      ...(process.env.AUTH_GOOGLE_ID
        ? [
            Google({
              clientId: process.env.AUTH_GOOGLE_ID,
              clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            }),
          ]
        : []),
    ],
    adapter: SupabaseAdapter({ url: supabaseUrl, secret: supabaseKey }),
    callbacks: {
      session({ session, user }: { session: { user?: { id?: string } }; user: { id: string } }) {
        if (session.user) session.user.id = user.id;
        return session;
      },
    },
  } as Parameters<typeof Auth>[1];
}

// Extract the current session from a Request object.
// Use inside createServerFn handlers where you have access to the raw request.
export async function getSession(request: Request) {
  const config = getAuthConfig();
  const response = await Auth(
    new Request(new URL("/api/auth/session", request.url), {
      headers: request.headers,
    }),
    config,
  );
  try {
    return (await response.json()) as { user?: { id: string; email?: string; name?: string } } | null;
  } catch {
    return null;
  }
}

// Throw if not authenticated — use at the top of protected server functions.
export async function requireSession(request: Request) {
  const session = await getSession(request);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
