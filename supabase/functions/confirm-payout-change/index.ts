// Confirm a payout-method change via emailed token.
// GET ?token=...  → returns request details (for the confirmation page)
// POST { token }  → applies the change and marks the request confirmed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let token = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token") || "";
    } else {
      const body = await req.json().catch(() => ({}));
      token = body.token || "";
    }
    if (!token) throw new Error("Missing token");

    const { data: request, error: reqErr } = await admin
      .from("payout_change_requests")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (reqErr || !request) throw new Error("Invalid or expired link");
    if (request.confirmed_at) throw new Error("This change has already been confirmed");
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      throw new Error("This confirmation link has expired. Please request a new one.");
    }

    if (req.method === "GET") {
      // Just return preview info for the page
      const { data: org } = await admin
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .maybeSingle();
      return new Response(JSON.stringify({
        success: true,
        organization_name: org?.name || null,
        change_type: request.change_type,
        old_value: request.old_value,
        requested_method: request.requested_method,
        paypal_email: request.paypal_email,
        mailing_address: request.mailing_address,
        expires_at: request.expires_at,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // POST → apply the change
    const orgId = request.organization_id;
    const newMethod = request.requested_method as string | null;

    if (request.change_type === "remove_stripe") {
      // Clear Stripe details on the payout method record
      await admin
        .from("organization_payout_methods")
        .update({
          stripe_account_id: null,
          stripe_onboarding_complete: false,
          stripe_account_status: "disconnected",
          stripe_account_last4: null,
          stripe_account_brand: null,
          preferred_method: newMethod || "check",
        } as any)
        .eq("organization_id", orgId);
      await admin
        .from("organizations")
        .update({
          stripe_account_id: null,
          payout_method: newMethod || "check",
        } as any)
        .eq("id", orgId);
    } else if (request.change_type === "switch_method") {
      const updates: Record<string, unknown> = { preferred_method: newMethod };
      if (newMethod === "paypal" && request.paypal_email) {
        updates.paypal_email = request.paypal_email;
      }
      await admin
        .from("organization_payout_methods")
        .upsert({ organization_id: orgId, ...updates } as any, { onConflict: "organization_id" });

      const orgUpdates: Record<string, unknown> = { payout_method: newMethod };
      if (newMethod === "check" && request.mailing_address) {
        orgUpdates.mailing_address = request.mailing_address;
      }
      await admin.from("organizations").update(orgUpdates as any).eq("id", orgId);
    }

    await admin
      .from("payout_change_requests")
      .update({
        confirmed_at: new Date().toISOString(),
        status: "confirmed",
      } as any)
      .eq("id", request.id);

    // Audit log
    await admin.from("payout_audit_log").insert({
      organization_id: orgId,
      user_id: request.requested_by,
      action: "payout_change_confirmed",
      details: {
        summary: `Payout change confirmed via email (${request.change_type})`,
        change_type: request.change_type,
        new_method: newMethod,
      },
    } as any);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
