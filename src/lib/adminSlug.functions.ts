import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Platform-admin only: rewrite a tournament's default /t/<slug> URL. */
export const setTournamentDefaultSlug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; slug: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const slug = slugify(data.slug);
    if (slug.length < 3) throw new Error("URL must be at least 3 characters.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: taken } = await supabaseAdmin
      .from("tournaments")
      .select("id")
      .or(`slug.eq.${slug},custom_slug.eq.${slug}`)
      .neq("id", data.tournamentId)
      .limit(1)
      .maybeSingle();
    if (taken) throw new Error("That URL is already taken.");

    const { error } = await supabaseAdmin
      .from("tournaments")
      .update({ slug })
      .eq("id", data.tournamentId);
    if (error) throw new Error(error.message);

    return { slug };
  });
