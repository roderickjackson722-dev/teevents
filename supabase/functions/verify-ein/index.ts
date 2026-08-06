import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

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
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "You must be signed in to save an EIN." }, 401);

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) return json({ error: "Your session expired. Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const ein = body?.ein as string | undefined;
    const organization_id = body?.organization_id as string | undefined;
    if (!ein || !organization_id) return json({ error: "Missing EIN or organization." }, 400);

    // Validate EIN format (XX-XXXXXXX)
    const cleanEin = String(ein).replace(/\D/g, "");
    if (cleanEin.length !== 9) {
      return json({ error: "Invalid EIN format. Must be 9 digits (XX-XXXXXXX)." }, 400);
    }

    // Authorize: org owner/admin, or platform admin
    const [{ data: member }, { data: platformAdmin }] = await Promise.all([
      supabaseAdmin
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organization_id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    const orgRole = (member as { role?: string } | null)?.role;
    const authorized = platformAdmin != null || orgRole === "owner" || orgRole === "admin";
    if (!authorized) {
      return json(
        { error: "Only organization owners or admins can update nonprofit status." },
        403,
      );
    }

    console.log(`[EIN Verify] Looking up EIN: ${cleanEin}`);

    let nonprofitName = "";
    let verified = false;

    // Best-effort IRS Tax Exempt Organization Search lookup (never blocks saving)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const irsRes = await fetch(
        `https://apps.irs.gov/app/eos/api/records?ein=${cleanEin}&pageSize=1`,
        { headers: { Accept: "application/json" }, signal: controller.signal },
      );
      clearTimeout(timer);

      if (irsRes.ok) {
        const irsData = await irsRes.json().catch(() => null);
        const records = irsData?.records || irsData?.organizations || [];
        if (records.length > 0) {
          const org = records[0];
          nonprofitName = org.name || org.orgName || org.sort_name || "";
          verified = true;
          console.log(`[EIN Verify] Found: ${nonprofitName}`);
        } else {
          console.log(`[EIN Verify] No IRS records for ${cleanEin}`);
        }
      } else {
        console.warn(`[EIN Verify] IRS API returned ${irsRes.status}`);
      }
    } catch (irsErr) {
      console.warn("[EIN Verify] IRS lookup unavailable:", String(irsErr));
    }

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

    if (updateErr) {
      console.error("[EIN Verify] Update failed:", updateErr.message);
      return json({ error: `Could not save EIN: ${updateErr.message}` }, 400);
    }

    return json({
      success: true,
      verified,
      nonprofit_name: nonprofitName || null,
      ein: einFormatted,
      message: verified
        ? `Verified! ${nonprofitName} is a registered 501(c)(3) organization.`
        : `EIN ${einFormatted} saved and will appear on your donation receipts. We could not auto-verify with the IRS right now — your status is recorded as pending.`,
    });
  } catch (error) {
    console.error("[EIN Verify] Unexpected error:", error);
    return json({ error: (error as Error)?.message || "Unexpected error" }, 500);
  }
});
