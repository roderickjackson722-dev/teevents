import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const { ein, organization_id } = await req.json();
    if (!ein || !organization_id) throw new Error("Missing EIN or organization_id");

    // Validate EIN format (XX-XXXXXXX)
    const cleanEin = ein.replace(/\D/g, "");
    if (cleanEin.length !== 9) throw new Error("Invalid EIN format. Must be 9 digits (XX-XXXXXXX).");

    // Verify user is org owner
    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single();

    if (!member || member.role !== "owner") throw new Error("Only organization owners can verify nonprofit status");

    // Query IRS Exempt Organizations API
    // Uses the IRS Tax Exempt Organization Search (TEOS) API
    const formattedEin = cleanEin;
    const irsUrl = `https://apps.irs.gov/app/eos/api/records?ein=${formattedEin}&pageSize=1`;

    console.log(`[EIN Verify] Looking up EIN: ${formattedEin}`);

    let nonprofitName = "";
    let verified = false;

    try {
      const irsRes = await fetch(irsUrl, {
        headers: { "Accept": "application/json" },
      });

      if (irsRes.ok) {
        const irsData = await irsRes.json();
        const records = irsData?.records || irsData?.organizations || [];

        if (records.length > 0) {
          const org = records[0];
          nonprofitName = org.name || org.orgName || org.sort_name || "";
          verified = true;
          console.log(`[EIN Verify] Found: ${nonprofitName}`);
        } else {
          console.log(`[EIN Verify] No records found for EIN ${formattedEin}`);
        }
      } else {
        console.warn(`[EIN Verify] IRS API returned ${irsRes.status}`);
      }
    } catch (irsErr) {
      // IRS API may be unavailable — fall back to manual
      console.warn("[EIN Verify] IRS API unavailable, falling back to manual entry:", irsErr);
    }

    // If IRS lookup failed, allow manual entry but mark as pending verification
    const einFormatted = `${cleanEin.slice(0, 2)}-${cleanEin.slice(2)}`;

    const { error: updateErr } = await supabaseAdmin
      .from("organizations")
      .update({
        is_nonprofit: true,
        ein: einFormatted,
        nonprofit_name: nonprofitName || null,
        nonprofit_verified: verified,
      })
      .eq("id", organization_id);

    if (updateErr) throw new Error(updateErr.message);

    return new Response(
      JSON.stringify({
        success: true,
        verified,
        nonprofit_name: nonprofitName || null,
        ein: einFormatted,
        message: verified
          ? `Verified! ${nonprofitName} is a registered 501(c)(3) organization.`
          : "EIN saved. We could not auto-verify with the IRS at this time — your nonprofit status has been recorded and will be manually confirmed.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
