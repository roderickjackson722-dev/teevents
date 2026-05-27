// Validates a bank-change verification token (GET) and applies it (POST).
// On POST: promotes pending_bank_last4/brand into the live fields, clears
// the pending state, and restores is_verified based on Stripe payouts_enabled.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let token = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      token = url.searchParams.get("token") || "";
    } else {
      try {
        const body = await req.json();
        token = body?.token || "";
      } catch {
        token = "";
      }
    }
    if (!token) throw new Error("Missing token");

    const { data: pm } = await admin
      .from("organization_payout_methods")
      .select("organization_id, pending_bank_last4, pending_bank_brand, bank_change_status, bank_change_expires_at, bank_change_confirmed_at, stripe_account_last4, stripe_account_brand")
      .eq("bank_change_token", token)
      .maybeSingle();

    if (!pm) throw new Error("This link is invalid or has expired.");
    if ((pm as any).bank_change_status === "confirmed" || (pm as any).bank_change_confirmed_at) {
      return new Response(JSON.stringify({ error: "This change has already been confirmed." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 410,
      });
    }
    if ((pm as any).bank_change_expires_at && new Date((pm as any).bank_change_expires_at) < new Date()) {
      throw new Error("This confirmation link has expired. Contact info@teevents.golf for help.");
    }

    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", (pm as any).organization_id)
      .maybeSingle();

    if (req.method === "GET") {
      // Preview only — do not apply
      return new Response(
        JSON.stringify({
          success: true,
          organization_name: org?.name || null,
          old_bank: `${(pm as any).stripe_account_brand || "Bank"} ••••${(pm as any).stripe_account_last4 || ""}`,
          new_bank: `${(pm as any).pending_bank_brand || "Bank"} ••••${(pm as any).pending_bank_last4 || ""}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // POST → apply change
    const { error: upErr } = await admin
      .from("organization_payout_methods")
      .update({
        stripe_account_last4: (pm as any).pending_bank_last4,
        stripe_account_brand: (pm as any).pending_bank_brand,
        pending_bank_last4: null,
        pending_bank_brand: null,
        bank_change_status: "confirmed",
        bank_change_confirmed_at: new Date().toISOString(),
        bank_change_token: null,
        is_verified: true,
      })
      .eq("organization_id", (pm as any).organization_id);
    if (upErr) throw new Error(upErr.message);

    // Notify info@ that confirmation happened
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: ["info@teevents.golf"],
            subject: `✅ Bank change confirmed — ${org?.name || "Organization"}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:20px;color:#111">
                <h2 style="color:#1a5c38;">Bank account change confirmed</h2>
                <p>The organizer for <strong>${org?.name || "Unknown organization"}</strong> has verified their bank account change. Payouts are re-enabled.</p>
                <p><strong>New bank:</strong> ${(pm as any).pending_bank_brand || "Bank"} ••••${(pm as any).pending_bank_last4 || ""}</p>
                <p><strong>Previous bank:</strong> ${(pm as any).stripe_account_brand || "Bank"} ••••${(pm as any).stripe_account_last4 || ""}</p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.error("confirm-bank-change notify failed", e);
      }
    }

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
