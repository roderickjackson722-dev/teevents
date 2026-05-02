// Organizer action: approve or deny a vendor application.
// On approve: optionally generate a Stripe payment link (5% platform fee via Connect routing)
// and email the vendor. On deny: email the vendor with a polite note.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveRouting } from "../_shared/connectRouting.ts";

const PLATFORM_FEE_RATE = 0.05;
const calculateGrossedUpStripeFee = (subtotalCents: number) =>
  Math.max(0, Math.round((subtotalCents + 30) / (1 - 0.029)) - subtotalCents);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const escape = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

interface ApproveBody {
  vendor_registration_id: string;
  decision: "approved" | "denied";
  organization_id: string; // for admin impersonation, the org we're acting for
  message?: string; // optional custom message included in email
  booth_location?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: must be authenticated org member or admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as ApproveBody;
    const { vendor_registration_id, decision, organization_id, message, booth_location } = body;

    if (!vendor_registration_id || !["approved", "denied"].includes(decision)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: user must be member of organization_id OR admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    let allowed = !!isAdmin;
    if (!allowed && organization_id) {
      const { data: isMember } = await supabaseAdmin.rpc("is_org_member", {
        _user_id: user.id, _org_id: organization_id,
      });
      allowed = !!isMember;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch vendor + tournament
    const { data: reg, error: regErr } = await supabaseAdmin
      .from("vendor_registrations")
      .select("id, tournament_id, vendor_name, contact_name, contact_email, booth_fee_cents, payment_status")
      .eq("id", vendor_registration_id)
      .single();
    if (regErr || !reg) throw new Error("Vendor application not found");

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, organization_id, payment_method_override")
      .eq("id", (reg as any).tournament_id)
      .single();
    if (!tournament) throw new Error("Tournament not found");

    // Build update
    const updates: Record<string, unknown> = { status: decision };
    if (booth_location) updates.booth_location = booth_location;

    let paymentUrl: string | null = null;

    if (decision === "approved" && (reg as any).booth_fee_cents && (reg as any).booth_fee_cents > 0 && (reg as any).payment_status !== "paid") {
      // Generate Stripe checkout for booth fee (5% platform fee via destination charge)
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const routing = await resolveRouting(
        supabaseAdmin,
        stripe,
        (tournament as any).id,
        (tournament as any).organization_id,
        (tournament as any).payment_method_override,
        "vendor",
      );

      const grossCents = (reg as any).booth_fee_cents as number;
      const platformFeeCents = Math.round(grossCents * PLATFORM_FEE_RATE);
      const stripeFeeCents = calculateGrossedUpStripeFee(grossCents + platformFeeCents);
      const combinedFeesCents = platformFeeCents + stripeFeeCents;
      const chargeTotalCents = grossCents + combinedFeesCents;

      const origin = req.headers.get("origin") || "https://teevents.lovable.app";
      const lineItems: any[] = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Vendor booth fee — ${(tournament as any).title}`,
              description: `Booth fee for ${(reg as any).vendor_name}`,
            },
            unit_amount: grossCents,
          },
          quantity: 1,
        },
      ];
      if (combinedFeesCents > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: "Fees" },
            unit_amount: combinedFeesCents,
          },
          quantity: 1,
        });
      }

      const checkoutParams: any = {
        customer_email: (reg as any).contact_email,
        line_items: lineItems,
        mode: "payment",
        success_url: `${origin}/t/${(tournament as any).slug}?vendor_paid=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/t/${(tournament as any).slug}?vendor_paid_cancel=true`,
        metadata: {
          type: "vendor_booth_fee",
          tournament_id: (tournament as any).id,
          organization_id: (tournament as any).organization_id,
          vendor_registration_id: (reg as any).id,
          gross_amount_cents: String(grossCents),
          platform_fee_cents: String(platformFeeCents),
          stripe_fee_cents: String(stripeFeeCents),
          application_fee_cents: String(combinedFeesCents),
          charge_total_cents: String(chargeTotalCents),
          routing: routing.useDestinationCharge ? "destination" : "platform_escrow",
        },
      };
      if (routing.useDestinationCharge) {
        checkoutParams.payment_intent_data = {
          application_fee_amount: combinedFeesCents,
          transfer_data: { destination: routing.organizerStripeAccountId! },
          on_behalf_of: routing.organizerStripeAccountId!,
        };
      }
      const session = await stripe.checkout.sessions.create(checkoutParams);
      paymentUrl = session.url;
      updates.stripe_session_id = session.id;
    }

    await supabaseAdmin
      .from("vendor_registrations")
      .update(updates)
      .eq("id", vendor_registration_id);

    // Email vendor
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const tName = (tournament as any).title;
        const isApproved = decision === "approved";
        const subject = isApproved
          ? `You've been approved as a vendor — ${tName}`
          : `Update on your vendor application — ${tName}`;
        const headerColor = isApproved ? "#1a5c38" : "#6b7280";
        const headerText = isApproved ? "You're Approved! 🎉" : "Application Update";

        const body = isApproved
          ? `
            <p>Hi ${escape((reg as any).contact_name)},</p>
            <p>Great news — your application to be a vendor at <strong>${escape(tName)}</strong> has been approved!</p>
            ${booth_location ? `<p><strong>Booth location:</strong> ${escape(booth_location)}</p>` : ""}
            ${paymentUrl ? `
              <p>Please complete your booth fee payment to confirm your spot:</p>
              <p style="text-align:center;margin:24px 0;">
                <a href="${paymentUrl}" style="display:inline-block;padding:12px 28px;background:#F5A623;color:#1a5c38;text-decoration:none;border-radius:6px;font-weight:600;">Pay Booth Fee</a>
              </p>
            ` : ""}
            ${message ? `<p>${escape(message)}</p>` : ""}
            <p>The organizer will be in touch with setup instructions closer to the event date.</p>
          `
          : `
            <p>Hi ${escape((reg as any).contact_name)},</p>
            <p>Thank you for your interest in being a vendor at <strong>${escape(tName)}</strong>. Unfortunately we are unable to accommodate your application at this time.</p>
            ${message ? `<p>${escape(message)}</p>` : ""}
            <p>We appreciate you reaching out and hope to work with you in the future.</p>
          `;

        const html = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="background:${headerColor};padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">${headerText}</h2>
    </td></tr>
    <tr><td style="padding:24px;color:#374151;line-height:1.6;">
      ${body}
      <p style="margin-top:24px;">— The TeeVents Team</p>
    </td></tr>
  </table>
</body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [(reg as any).contact_email],
            subject,
            html,
          }),
        });
      } catch (e) {
        console.error("Vendor decision email failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, payment_url: paymentUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
