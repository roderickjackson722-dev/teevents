import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Platform-admin tool: attach an organizer (by email) to the organization
 * that owns a given tournament, so it shows up on their dashboard.
 *
 * - Verifies caller is a platform admin.
 * - Finds an existing auth user by email; if none exists AND `create_if_missing`
 *   is true, creates one with a temp password (returned in the response so the
 *   admin can share it manually — no email is sent from here).
 * - Upserts an org_members row for that user on the tournament's organization
 *   with the requested role (default "owner").
 * - NEVER touches the password of an existing user (and especially never for
 *   platform admins).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: uerr } = await anon.auth.getUser(token);
    if (uerr || !userData.user) throw new Error("Not authenticated");
    const adminUser = userData.user;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isPlatformAdmin } = await admin.rpc("has_role", {
      _user_id: adminUser.id, _role: "admin",
    });
    if (!isPlatformAdmin) throw new Error("Platform admin access required");

    const body = await req.json();
    const tournament_id: string | undefined = body?.tournament_id;
    const emailRaw: string | undefined = body?.email;
    const role: string = body?.role || "owner";
    const create_if_missing: boolean = !!body?.create_if_missing;
    const full_name: string | null = body?.full_name ? String(body.full_name).trim().slice(0, 255) : null;

    if (!tournament_id) throw new Error("tournament_id is required");
    if (!emailRaw) throw new Error("email is required");
    const email = String(emailRaw).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    if (!["owner", "admin", "editor", "viewer", "scoring_only"].includes(role)) {
      throw new Error("Invalid role");
    }

    const { data: t, error: terr } = await admin
      .from("tournaments")
      .select("id, title, organization_id")
      .eq("id", tournament_id).single();
    if (terr || !t?.organization_id) throw new Error("Tournament or organization not found");

    const { data: usersList } = await admin.auth.admin.listUsers();
    let user = usersList?.users?.find((u: any) => u.email?.toLowerCase() === email);
    let tempPassword: string | null = null;
    let created = false;

    if (!user) {
      if (!create_if_missing) {
        return new Response(JSON.stringify({
          error: "no_user",
          message: `No account exists for ${email}. Confirm the email or check 'Create account'.`,
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      tempPassword = generateTempPassword();
      const { data: c, error: cerr } = await admin.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true,
        user_metadata: { full_name, force_password_change: true },
      });
      if (cerr || !c?.user) throw new Error(cerr?.message || "Failed to create user");
      user = c.user;
      created = true;
    }

    const { error: mErr } = await admin.from("org_members").upsert({
      organization_id: t.organization_id,
      user_id: user.id,
      role,
      name: full_name || (user.user_metadata as any)?.full_name || null,
    }, { onConflict: "organization_id,user_id" });
    if (mErr) throw new Error("Failed to attach organizer: " + mErr.message);

    return new Response(JSON.stringify({
      success: true,
      email,
      user_id: user.id,
      organization_id: t.organization_id,
      role,
      created_user: created,
      temp_password: tempPassword, // only present when we just created the account
      password_untouched: !created,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("admin-attach-organizer error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*";
  const all = upper + lower + nums + syms;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(syms);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}
