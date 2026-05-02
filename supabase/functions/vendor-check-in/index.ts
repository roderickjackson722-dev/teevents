// Vendor check-in by 6-character code. Authenticated organizer only.
// Returns the vendor record (and updates checked_in flag).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  code?: string;
  vendor_registration_id?: string;
  tournament_id?: string;
  undo?: boolean;
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

    const { code, vendor_registration_id, tournament_id, undo } = (await req.json()) as Body;
    if (!code && !vendor_registration_id) {
      return new Response(JSON.stringify({ error: "code or vendor_registration_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let query = supabaseAdmin
      .from("vendor_registrations")
      .select("id, tournament_id, vendor_name, contact_name, booth_location, status, checked_in, check_in_code");
    if (vendor_registration_id) query = query.eq("id", vendor_registration_id);
    else query = query.eq("check_in_code", String(code).trim().toUpperCase());
    if (tournament_id) query = query.eq("tournament_id", tournament_id);

    const { data: reg } = await query.maybeSingle();
    if (!reg) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has access to this tournament's org
    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, organization_id, title")
      .eq("id", (reg as any).tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", (tournament as any).organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if ((reg as any).status !== "approved") {
      return new Response(
        JSON.stringify({ error: `Vendor is ${(reg as any).status}, not approved`, vendor: reg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (undo) {
      await supabaseAdmin
        .from("vendor_registrations")
        .update({ checked_in: false, checked_in_at: null })
        .eq("id", (reg as any).id);
      return new Response(
        JSON.stringify({ success: true, action: "undo", vendor: { ...(reg as any), checked_in: false } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if ((reg as any).checked_in) {
      return new Response(
        JSON.stringify({ success: true, already: true, vendor: reg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseAdmin
      .from("vendor_registrations")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", (reg as any).id);

    return new Response(
      JSON.stringify({ success: true, vendor: { ...(reg as any), checked_in: true } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
