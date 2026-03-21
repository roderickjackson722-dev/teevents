import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendRegistrantConfirmationEmail } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    ).auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { registration_ids } = await req.json();
    if (!registration_ids || !Array.isArray(registration_ids) || registration_ids.length === 0) {
      throw new Error("Missing registration_ids array");
    }

    // Get registrations with tournament info
    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .select("id, first_name, last_name, email, tournament_id")
      .in("id", registration_ids);

    if (regErr || !registrations || registrations.length === 0) {
      throw new Error("Registrations not found");
    }

    // Get tournament info
    const tournamentId = registrations[0].tournament_id;
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("title, date, location, organization_id")
      .eq("id", tournamentId)
      .single();

    if (!tournament) throw new Error("Tournament not found");

    // Verify user is org member
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isMember } = await supabaseAdmin.rpc("is_org_member", { _user_id: user.id, _org_id: tournament.organization_id });
    if (!isAdmin && !isMember) throw new Error("Not authorized");

    // Send emails
    let sent = 0;
    let failed = 0;
    for (const reg of registrations) {
      try {
        await sendRegistrantConfirmationEmail(
          reg.first_name,
          reg.last_name,
          reg.email,
          tournament.title,
          tournament.date,
          tournament.location,
        );
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${reg.email}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("[Resend Confirmation Error]", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
