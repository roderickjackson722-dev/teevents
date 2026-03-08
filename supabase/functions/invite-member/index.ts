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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const { organization_id, email, permissions } = await req.json();

    if (!organization_id || !email) {
      throw new Error("organization_id and email are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error("Invalid email address");

    // Verify caller is org owner using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: membership } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only organization owners can invite members");
    }

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id);

    // Insert invitation
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("org_invitations")
      .upsert(
        {
          organization_id,
          email: email.toLowerCase(),
          role: "editor",
          permissions: permissions || [],
          invited_by: user.id,
          status: "pending",
        },
        { onConflict: "organization_id,email" }
      )
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Check if user with this email already exists, auto-accept
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const invitedUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (invitedUser) {
      // Check if not already a member
      const { data: alreadyMember } = await supabaseAdmin
        .from("org_members")
        .select("id")
        .eq("organization_id", organization_id)
        .eq("user_id", invitedUser.id)
        .single();

      if (!alreadyMember) {
        // Auto-add as member
        await supabaseAdmin.from("org_members").insert({
          organization_id,
          user_id: invitedUser.id,
          role: "editor",
          permissions: permissions || [],
        });

        await supabaseAdmin
          .from("org_invitations")
          .update({ status: "accepted" })
          .eq("id", invite.id);

        return new Response(
          JSON.stringify({ success: true, auto_accepted: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invite.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
