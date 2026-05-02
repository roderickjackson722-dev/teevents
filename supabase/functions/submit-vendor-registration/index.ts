// Public endpoint: vendor submits an application for a tournament.
// Saves to vendor_registrations and notifies the organizer + the vendor.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface SubmitBody {
  tournament_id: string;
  vendor_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  business_type?: string;
  answers?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as SubmitBody;
    const {
      tournament_id,
      vendor_name,
      contact_name,
      contact_email,
      contact_phone,
      business_type,
      answers,
    } = body;

    if (
      !tournament_id ||
      !vendor_name?.trim() ||
      !contact_name?.trim() ||
      !contact_email?.trim()
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (
      vendor_name.length > 200 ||
      contact_name.length > 200 ||
      contact_email.length > 320
    ) {
      return new Response(
        JSON.stringify({ error: "Field too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, contact_email, vendor_booth_fee_cents")
      .eq("id", tournament_id)
      .single();
    if (tErr || !tournament) throw new Error("Tournament not found");

    const { data: registration, error: regErr } = await supabaseAdmin
      .from("vendor_registrations")
      .insert({
        tournament_id,
        vendor_name: vendor_name.trim(),
        contact_name: contact_name.trim(),
        contact_email: contact_email.trim().toLowerCase(),
        contact_phone: contact_phone?.trim() || null,
        business_type: business_type?.trim() || null,
        answers: answers || {},
        booth_fee_cents: (tournament as any).vendor_booth_fee_cents || null,
        status: "pending_approval",
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (regErr || !registration) throw new Error(regErr?.message || "Failed to save vendor application");

    // Notify organizer + admin
    if (RESEND_API_KEY) {
      try {
        const organizerEmail =
          (tournament as any).contact_email || "info@teevents.golf";
        const adminHtml = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">New Vendor Application</h2>
    </td></tr>
    <tr><td style="padding:24px;color:#374151;">
      <p><strong>${escape(vendor_name)}</strong> has applied to be a vendor at <strong>${escape((tournament as any).title)}</strong>.</p>
      <p><strong>Contact:</strong> ${escape(contact_name)} &lt;${escape(contact_email)}&gt;</p>
      ${contact_phone ? `<p><strong>Phone:</strong> ${escape(contact_phone)}</p>` : ""}
      ${business_type ? `<p><strong>Business type:</strong> ${escape(business_type)}</p>` : ""}
      <p style="margin-top:16px;">Review and approve in your dashboard: <a href="https://teevents.lovable.app/dashboard/vendors" style="color:#1a5c38;">Manage Vendors</a></p>
    </td></tr>
  </table>
</body></html>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [organizerEmail, "info@teevents.golf"],
            subject: `New vendor application — ${vendor_name} — ${(tournament as any).title}`,
            html: adminHtml,
          }),
        });

        // Vendor confirmation
        const vendorHtml = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="background:#1a5c38;padding:24px;text-align:center;color:#fff;">
      <h2 style="margin:0;">Application Received</h2>
    </td></tr>
    <tr><td style="padding:24px;color:#374151;line-height:1.6;">
      <p>Hi ${escape(contact_name)},</p>
      <p>Thank you for applying to be a vendor at <strong>${escape((tournament as any).title)}</strong>. Your application has been received and is pending review.</p>
      <p>The tournament organizer will reach out shortly with next steps. If a booth fee applies, you'll receive a secure payment link once approved.</p>
      <p>Thanks,<br/>The TeeVents Team</p>
    </td></tr>
  </table>
</body></html>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [contact_email.trim()],
            subject: `Vendor application received — ${(tournament as any).title}`,
            html: vendorHtml,
          }),
        });
      } catch (e) {
        console.error("Vendor notification email failed:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, registration_id: registration.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
