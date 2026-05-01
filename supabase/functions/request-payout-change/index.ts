// Request a payout-method change. Generates a token, stores a pending
// request in payout_change_requests, and emails the organizer a
// confirmation link. The change is NOT applied until they click it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_TTL_MINUTES = 15;

function genToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Not authenticated");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes.user;
    if (!user?.email) throw new Error("Not authenticated");

    const body = await req.json();
    const {
      organization_id,
      change_type, // "remove_stripe" | "switch_method"
      requested_method, // "stripe" | "paypal" | "check" | null  (null when removing)
      paypal_email,
      mailing_address,
    } = body;

    if (!organization_id || !change_type) throw new Error("Missing required fields");

    // Verify caller is a member of the org
    const { data: membership } = await admin
      .from("org_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) throw new Error("Not a member of this organization");

    // Capture current method snapshot for the email & audit
    const { data: org } = await admin
      .from("organizations")
      .select("name, payout_method")
      .eq("id", organization_id)
      .single();
    const { data: pm } = await admin
      .from("organization_payout_methods")
      .select("preferred_method, paypal_email, stripe_account_id")
      .eq("organization_id", organization_id)
      .maybeSingle();

    const currentMethod = pm?.preferred_method || org?.payout_method || "none";

    const confirmToken = genToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await admin
      .from("payout_change_requests")
      .insert({
        organization_id,
        requested_by: user.id,
        change_type,
        old_value: currentMethod,
        new_value: requested_method || null,
        requested_method: requested_method || null,
        paypal_email: paypal_email || null,
        mailing_address: mailing_address || null,
        status: "pending",
        token: confirmToken,
        expires_at: expiresAt,
      } as any)
      .select("id")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    // Send confirmation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const origin = req.headers.get("origin") || "https://teevents.golf";
    const confirmUrl = `${origin}/confirm-payout-change?token=${confirmToken}`;

    const friendlyAction = change_type === "remove_stripe"
      ? "remove your Stripe Connect payout account"
      : `change your payout method to ${requested_method}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h2 style="color:#1a5c38;margin:0 0 12px">Confirm your payout method change</h2>
        <p>We received a request to <strong>${friendlyAction}</strong> for <strong>${org?.name || "your organization"}</strong>.</p>
        <p>Click the button below to confirm. This link expires in ${TOKEN_TTL_MINUTES} minutes.</p>
        <p style="margin:28px 0">
          <a href="${confirmUrl}"
             style="background:#1a5c38;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Confirm change
          </a>
        </p>
        <p style="font-size:12px;color:#666">If the button doesn't work, paste this URL into your browser:<br/>
          <a href="${confirmUrl}" style="color:#1a5c38;word-break:break-all">${confirmUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="font-size:12px;color:#666">If you did not request this change, you can ignore this email or contact us immediately at <a href="mailto:info@teevents.golf">info@teevents.golf</a>.</p>
        <p style="font-size:12px;color:#999">— The TeeVents Team</p>
      </div>
    `;

    let emailSent = false;
    let emailError: string | null = null;

    if (!resendKey) {
      emailError = "RESEND_API_KEY is not configured";
      console.error(emailError);
    } else {
      try {
        console.log(`Sending payout-change confirmation email to ${user.email}`);
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TeeVents <notifications@notifications.teevents.golf>",
            to: [user.email],
            subject: `Confirm payout method change for ${org?.name || "your organization"}`,
            html,
          }),
        });
        const respText = await resp.text();
        if (!resp.ok) {
          emailError = `Resend ${resp.status}: ${respText}`;
          console.error("Resend send failed:", emailError);
        } else {
          emailSent = true;
          console.log("Resend send ok:", respText);
        }
      } catch (e) {
        emailError = (e as Error).message;
        console.error("Resend exception:", emailError);
      }
    }

    if (!emailSent) {
      // Surface a real error so the UI can warn the user instead of showing
      // a misleading "check your email" modal.
      return new Response(
        JSON.stringify({
          error: `Failed to send confirmation email${emailError ? `: ${emailError}` : ""}`,
          request_id: inserted.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }

    return new Response(
      JSON.stringify({ success: true, request_id: inserted.id, sent_to: user.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
