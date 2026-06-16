// Admin-only: marks a real demo tournament ready for conversion, generates a one-time
// time-limited conversion token (72h real / 24h test-mode), records optional discount,
// deletes mock data on real sends, and emails the prospect a claim/signup link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FROM = "TeeVents <info@notifications.teevents.golf>";
const TTL_REAL_HOURS = 72;
const TTL_TEST_HOURS = 24;

type DiscountType = "none" | "percentage" | "fixed" | "free_pro";

function discountLine(t: DiscountType | null | undefined, v: number | null | undefined) {
  switch (t) {
    case "free_pro": return "🔥 Special offer: Free Pro upgrade ($399 value — 100% off)";
    case "percentage": return v && v > 0 ? `🔥 Special offer: ${v}% off Pro` : null;
    case "fixed": return v && v > 0 ? `🔥 Special offer: $${v} off Pro` : null;
    default: return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const {
      tournament_id, prospect_email, prospect_name, app_base_url,
      discount, test_mode,
    } = body as {
      tournament_id: string;
      prospect_email: string;
      prospect_name?: string;
      app_base_url?: string;
      discount?: { type: DiscountType; value?: number };
      test_mode?: boolean;
    };

    if (!tournament_id) {
      return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: corsHeaders });
    }
    const isTest = !!test_mode;
    const recipient = isTest ? (user.email ?? prospect_email) : prospect_email;
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipient))) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: corsHeaders });
    }

    const dType: DiscountType = (discount?.type ?? "none");
    const dValue = typeof discount?.value === "number" ? Math.max(0, Math.floor(discount!.value!)) : null;
    if (!["none", "percentage", "fixed", "free_pro"].includes(dType)) {
      return new Response(JSON.stringify({ error: "Invalid discount type" }), { status: 400, headers: corsHeaders });
    }
    if (dType === "percentage" && (dValue == null || dValue < 1 || dValue > 100)) {
      return new Response(JSON.stringify({ error: "Percentage must be 1–100" }), { status: 400, headers: corsHeaders });
    }
    if (dType === "fixed" && (dValue == null || dValue < 1)) {
      return new Response(JSON.stringify({ error: "Fixed discount must be > 0" }), { status: 400, headers: corsHeaders });
    }

    const { data: t, error: tErr } = await admin
      .from("tournaments")
      .select("id, title, is_demo, demo_converted_at, demo_conversion_used_at")
      .eq("id", tournament_id).maybeSingle();
    if (tErr || !t) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: corsHeaders });
    if (!t.is_demo) return new Response(JSON.stringify({ error: "Not a demo tournament" }), { status: 400, headers: corsHeaders });
    if (t.demo_converted_at || t.demo_conversion_used_at) {
      return new Response(JSON.stringify({ error: "This demo has already been claimed" }), { status: 409, headers: corsHeaders });
    }

    // Real sends wipe mock data; test mode preserves it.
    if (!isTest) {
      await admin.from("tournament_scores").delete().eq("tournament_id", tournament_id);
      await admin.from("tournament_registrations").delete().eq("tournament_id", tournament_id);
      await admin.from("tournament_sponsors").delete().eq("tournament_id", tournament_id);
    }

    const token = crypto.randomUUID();
    const ttlHours = isTest ? TTL_TEST_HOURS : TTL_REAL_HOURS;
    const expires = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    const { error: updErr } = await admin
      .from("tournaments")
      .update({
        demo_conversion_token: token,
        demo_conversion_token_expires_at: expires,
        demo_conversion_sent_at: new Date().toISOString(),
        demo_prospect_email: prospect_email || null,
        demo_prospect_name: prospect_name || null,
        demo_conversion_discount_type: dType,
        demo_conversion_discount_value: dValue,
        demo_conversion_is_test: isTest,
      })
      .eq("id", tournament_id);
    if (updErr) throw updErr;

    // Record the discount offer (for future Pro-checkout consumption)
    await admin.from("demo_conversion_discounts").insert({
      tournament_id,
      conversion_token: token,
      discount_type: dType,
      discount_value: dValue,
    });

    const baseUrl = app_base_url || "https://teevents.golf";
    const claimUrl = `${baseUrl}/claim-demo/${token}`;
    const offer = discountLine(dType, dValue);
    const testBanner = isTest
      ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;padding:10px 14px;border-radius:6px;margin-bottom:16px;font-weight:600">🔬 TEST EMAIL — Do not forward to prospects.</div>`
      : "";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.55">
  ${testBanner}
  <h2 style="color:#1a5c38;margin:0 0 16px">Claim your tournament</h2>
  <p>Hi ${prospect_name || "there"},</p>
  <p>Thanks for your time today. Your tournament <strong>${t.title}</strong> is ready to be claimed.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="${claimUrl}" style="background:#F5A623;color:#1a5c38;font-weight:700;padding:14px 28px;border-radius:6px;text-decoration:none;display:inline-block">Claim Your Tournament</a>
  </p>
  ${offer ? `<p style="background:#FFF7E6;border-left:4px solid #F5A623;padding:10px 14px;border-radius:4px"><strong>${offer}</strong></p>` : ""}
  <p>This single-use link expires in <strong>${ttlHours} hours</strong>. It will:</p>
  <ul>
    <li>Create your organizer account</li>
    <li>Give you full ownership of the tournament</li>
    <li>Keep all settings (date, fees, course details, branding)</li>
  </ul>
  <p>Questions? Just reply to this email.</p>
  <p style="margin-top:24px">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>
</div>`;
    const text = `${isTest ? "[TEST] " : ""}Hi ${prospect_name || "there"},

Claim your tournament "${t.title}" here (expires in ${ttlHours} hours):
${claimUrl}
${offer ? `\n${offer}\n` : ""}
— Rod Jackson, TeeVents Golf`;

    let emailResult: any = { skipped: true };
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [recipient],
          subject: `${isTest ? "[TEST] " : ""}Claim your tournament – ${t.title}`,
          html, text,
        }),
      });
      emailResult = await r.json();
    }

    return new Response(JSON.stringify({ ok: true, claimUrl, token, expiresAt: expires, test_mode: isTest, recipient, email: emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
