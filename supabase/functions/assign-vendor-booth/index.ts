// Organizer action: assign / reassign / unassign a booth to a vendor.
// Atomically prevents double-booking: returns 409 if booth already taken.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  vendor_registration_id: string;
  booth_id?: string | null; // null/undefined = unassign
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabaseAdmin.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { vendor_registration_id, booth_id } = (await req.json()) as Body;
    if (!vendor_registration_id) {
      return new Response(JSON.stringify({ error: "vendor_registration_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reg, error: regErr } = await supabaseAdmin
      .from("vendor_registrations")
      .select("id, tournament_id, booth_location, vendor_name")
      .eq("id", vendor_registration_id)
      .single();
    if (regErr || !reg) throw new Error("Vendor not found");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, organization_id")
      .eq("id", (reg as any).tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    // Org membership check
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", (tournament as any).organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Free the previous booth (if any)
    if ((reg as any).booth_location) {
      await supabaseAdmin
        .from("vendor_booth_locations")
        .update({ assigned_to: null, is_available: true })
        .eq("tournament_id", (reg as any).tournament_id)
        .eq("location_name", (reg as any).booth_location);
    }

    // Unassign?
    if (!booth_id) {
      await supabaseAdmin
        .from("vendor_registrations")
        .update({ booth_location: null })
        .eq("id", vendor_registration_id);
      return new Response(JSON.stringify({ success: true, booth_location: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load target booth
    const { data: booth } = await supabaseAdmin
      .from("vendor_booth_locations")
      .select("id, tournament_id, location_name, assigned_to, is_available")
      .eq("id", booth_id)
      .single();
    if (!booth) throw new Error("Booth not found");
    if ((booth as any).tournament_id !== (reg as any).tournament_id) throw new Error("Booth/vendor mismatch");

    // Atomic claim: only succeed if booth is currently unassigned
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("vendor_booth_locations")
      .update({ assigned_to: vendor_registration_id, is_available: false })
      .eq("id", booth_id)
      .is("assigned_to", null)
      .select("id, location_name")
      .maybeSingle();

    if (claimErr) throw claimErr;
    if (!claimed) {
      // Restore previous booth if we already cleared it
      if ((reg as any).booth_location) {
        await supabaseAdmin
          .from("vendor_booth_locations")
          .update({ assigned_to: vendor_registration_id, is_available: false })
          .eq("tournament_id", (reg as any).tournament_id)
          .eq("location_name", (reg as any).booth_location);
      }
      return new Response(
        JSON.stringify({ error: "This booth is already assigned to another vendor." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseAdmin
      .from("vendor_registrations")
      .update({ booth_location: (claimed as any).location_name })
      .eq("id", vendor_registration_id);

    return new Response(
      JSON.stringify({ success: true, booth_location: (claimed as any).location_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
