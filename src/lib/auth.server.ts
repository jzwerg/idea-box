import { getSupabaseUserClient } from "./supabase.server";

export async function getSession(request: Request) {
  const supabase = getSupabaseUserClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name as string | undefined,
    },
  };
}

export async function requireSession(request: Request) {
  const session = await getSession(request);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}
