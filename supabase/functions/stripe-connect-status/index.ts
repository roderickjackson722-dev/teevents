import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resolveBankAccountDetails = async (
  stripe: Stripe,
  stripeAccountId: string,
  account: any,
) => {
  const externalAccount = account.external_accounts?.data?.[0] as any;
  if (externalAccount?.last4) {
    return {
      last4: externalAccount.last4 as string,
      brand: externalAccount.bank_name || externalAccount.brand || null,
    };
  }

  try {
    const payouts = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: stripeAccountId },
    );

    const latestBankPayout = payouts.data.find(
      (payout) => payout.type === "bank_account" && typeof payout.destination === "string",
    );

    if (latestBankPayout) {
      const expandedPayout = await stripe.payouts.retrieve(
        latestBankPayout.id,
        { expand: ["destination"] },
        { stripeAccount: stripeAccountId },
      );

      const destination = expandedPayout.destination as any;
      if (destination && typeof destination !== "string" && destination.last4) {
        return {
          last4: destination.last4 as string,
          brand: destination.bank_name || null,
        };
      }
    }
  } catch (fallbackError) {
    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown fallback error";
    console.warn("stripe-connect-status fallback error:", fallbackMessage);
  }

  return { last4: null, brand: null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) throw new Error("Unauthorized");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.split(" ")[1]?.trim();
    let user = null;

    if (token) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error) user = data.user;
    }

    if (!user) {
      const { data, error } = await supabaseClient.auth.getUser();
      if (!error) user = data.user;
    }

    if (!user) throw new Error("Unauthorized");

    const userId = user.id;

    const { data: membership } = await supabaseClient
      .from("org_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (!membership) throw new Error("No organization found");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payoutMethod } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("stripe_account_id")
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("stripe_account_id")
      .eq("id", membership.organization_id)
      .maybeSingle();

    const stripeAccountId = payoutMethod?.stripe_account_id || org?.stripe_account_id || null;

    if (!stripeAccountId) {
      return new Response(
        JSON.stringify({ connected: false, charges_enabled: false, payouts_enabled: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(stripeAccountId);
    const { last4, brand } = await resolveBankAccountDetails(stripe, stripeAccountId, account);

    // Read existing record FIRST so we can detect a bank change
    const { data: existing } = await supabaseAdmin
      .from("organization_payout_methods")
      .select("connection_notified_at, stripe_account_last4, stripe_account_brand, bank_change_status, bank_change_token")
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    const priorLast4 = (existing as any)?.stripe_account_last4 || null;
    const priorBrand = (existing as any)?.stripe_account_brand || null;
    const bankChangeDetected =
      !!last4 && !!priorLast4 && last4 !== priorLast4 &&
      (existing as any)?.bank_change_status !== "pending_verification";

    const payoutMethodUpdate: Record<string, any> = {
      organization_id: membership.organization_id,
      stripe_account_id: stripeAccountId,
      stripe_account_status: account.charges_enabled ? "active" : "pending",
      stripe_onboarding_complete: !!account.details_submitted,
      // Block payouts until bank change is verified
      is_verified: bankChangeDetected ? false : !!account.payouts_enabled,
    };

    if (bankChangeDetected) {
      // Stage the new bank info as PENDING — do not overwrite stored last4/brand
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const confirmToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");
      payoutMethodUpdate.pending_bank_last4 = last4;
      payoutMethodUpdate.pending_bank_brand = brand;
      payoutMethodUpdate.bank_change_token = confirmToken;
      payoutMethodUpdate.bank_change_requested_at = new Date().toISOString();
      payoutMethodUpdate.bank_change_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      payoutMethodUpdate.bank_change_status = "pending_verification";
    } else if ((existing as any)?.bank_change_status !== "pending_verification") {
      // Normal sync — safe to write current bank details through
      if (last4) payoutMethodUpdate.stripe_account_last4 = last4;
      if (brand) payoutMethodUpdate.stripe_account_brand = brand;
    }

    const shouldNotifyFirstConnection =
      !!account.details_submitted &&
      !!account.charges_enabled &&
      !existing?.connection_notified_at &&
      !bankChangeDetected;

    if (shouldNotifyFirstConnection) {
      payoutMethodUpdate.connection_notified_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from("organization_payout_methods")
      .upsert(payoutMethodUpdate, { onConflict: "organization_id" });

    // Fetch org + owner email once for any emails below
    const { data: orgInfo } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", membership.organization_id)
      .maybeSingle();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const origin = req.headers.get("origin") || "https://teevents.golf";

    // Send bank-change verification email
    if (bankChangeDetected && RESEND_API_KEY) {
      try {
        // Find organizer owner email
        const { data: ownerMember } = await supabaseAdmin
          .from("org_members")
          .select("user_id")
          .eq("organization_id", membership.organization_id)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();
        let organizerEmail: string | null = null;
        if (ownerMember?.user_id) {
          const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(ownerMember.user_id);
          organizerEmail = ownerUser?.user?.email || null;
        }
        if (!organizerEmail) organizerEmail = user.email || null;

        const confirmUrl = `${origin}/confirm-bank-change?token=${payoutMethodUpdate.bank_change_token}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#111">
            <h2 style="color:#1a5c38;margin:0 0 12px">Confirm your bank account change</h2>
            <p>We detected a change to the bank account on file for <strong>${orgInfo?.name || "your organization"}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
              <tr><td style="padding:6px 0;color:#666;width:160px">Previous bank:</td><td style="padding:6px 0">${priorBrand || "Bank"} ••••${priorLast4}</td></tr>
              <tr><td style="padding:6px 0;color:#666">New bank:</td><td style="padding:6px 0"><strong>${brand || "Bank"} ••••${last4}</strong></td></tr>
            </table>
            <p style="background:#fff8e1;border-left:4px solid #F5A623;padding:12px 16px;border-radius:4px;margin:16px 0">
              <strong>Payouts are paused</strong> until you confirm this change.
            </p>
            <p>If you made this change, click below to verify and re-enable payouts. This link expires in 7 days.</p>
            <p style="margin:28px 0">
              <a href="${confirmUrl}" style="background:#F5A623;color:#1a5c38;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">
                Confirm bank change
              </a>
            </p>
            <p style="font-size:12px;color:#666">If you did NOT make this change, do not click the link. Reply to this email or contact <a href="mailto:info@teevents.golf">info@teevents.golf</a> immediately — your account may be compromised.</p>
            <p style="font-size:12px;color:#999;margin-top:24px">— The TeeVents Team</p>
          </div>
        `;

        const recipients = organizerEmail ? [organizerEmail] : [];
        if (recipients.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "TeeVents Golf Management <info@notifications.teevents.golf>",
              to: recipients,
              bcc: ["info@teevents.golf"],
              reply_to: "info@teevents.golf",
              subject: `Action required: Confirm bank account change for ${orgInfo?.name || "your organization"}`,
              html,
            }),
          });
        }
      } catch (notifyError) {
        console.error("bank-change verification email error:", notifyError);
      }
    }

    if (shouldNotifyFirstConnection && RESEND_API_KEY) {
      try {
        const { data: tournaments } = await supabaseAdmin
          .from("tournaments")
          .select("title, slug, site_published")
          .eq("organization_id", membership.organization_id);

        const tournamentList = (tournaments || [])
          .map((t: any) => `• ${t.title}${t.site_published ? " (published)" : ""}`)
          .join("<br/>") || "<em>No tournaments yet</em>";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: ["info@teevents.golf"],
            reply_to: "info@teevents.golf",
            subject: `✅ New Stripe Account Connected — ${orgInfo?.name || "Organization"}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
                <h2 style="color:#1a5c38;">New Stripe Account Connected</h2>
                <p>An organizer has successfully connected their Stripe account to TeeVents.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:6px 0;color:#666;">Organization:</td><td style="padding:6px 0;"><strong>${orgInfo?.name || "Unknown"}</strong></td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Stripe Account ID:</td><td style="padding:6px 0;font-family:monospace;">${stripeAccountId}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Charges enabled:</td><td style="padding:6px 0;">${account.charges_enabled ? "Yes" : "No"}</td></tr>
                  <tr><td style="padding:6px 0;color:#666;">Payouts enabled:</td><td style="padding:6px 0;">${account.payouts_enabled ? "Yes" : "No"}</td></tr>
                  ${last4 ? `<tr><td style="padding:6px 0;color:#666;">Bank account:</td><td style="padding:6px 0;">${brand || "Bank"} ••••${last4}</td></tr>` : ""}
                </table>
                <h3 style="color:#1a5c38;margin-top:24px;">Tournaments</h3>
                <p style="line-height:1.8;">${tournamentList}</p>
                <p style="margin:24px 0"><a href="https://teevents.golf/admin/stripe-connections" style="background:#F5A623;color:#1a5c38;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;">View All Connections</a></p>
              </div>
            `,
          }),
        });
      } catch (notifyError) {
        console.error("stripe-connect-status notification error:", notifyError);
      }
    }

    return new Response(
      JSON.stringify({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        account_id: account.id,
        last4,
        brand,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("stripe-connect-status error:", message);

    if (message === "Unauthorized") {
      return new Response(JSON.stringify({ error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // If Stripe can't access the account, return a structured "invalid" status
    // so the UI can show a helpful message instead of silently resetting
    const isAccessError = message.includes("does not have access") || message.includes("does not exist");
    if (isAccessError) {
      return new Response(
        JSON.stringify({
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          invalid_account: true,
          error_message: "The saved Stripe account could not be verified. It may not be connected to this platform. Please use the 'Connect Stripe Account' button to properly link your account through Stripe's onboarding flow, or disconnect and try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
