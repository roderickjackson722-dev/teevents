import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) throw new Error("Missing invitation token");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwtToken);
    if (userError || !user) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find the invitation
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("org_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invErr || !invitation) throw new Error("Invalid or expired invitation");

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from("org_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("This invitation has expired");
    }

    // Verify the user's email matches the invitation
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error(`This invitation was sent to ${invitation.email}. Please sign in with that email address.`);
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("org_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);
      return new Response(
        JSON.stringify({ success: true, already_member: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add as member
    const { error: memberErr } = await supabaseAdmin.from("org_members").insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role || "editor",
      permissions: invitation.permissions || [],
    });

    if (memberErr) throw new Error(memberErr.message);

    // Mark invitation as accepted
    await supabaseAdmin
      .from("org_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
