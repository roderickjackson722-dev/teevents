import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "info@teevents.golf";
const SENDER = "TeeVents Sales <notifications@notifications.teevents.golf>";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, email, organization, phone, tournamentsPerYear, notes } = await req.json();
    if (!name || !email || !organization) {
      return new Response(JSON.stringify({ error: "name, email, organization required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a5c38;">🏢 New Enterprise Inquiry</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${escape(name)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;"><a href="mailto:${escape(email)}">${escape(email)}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Organization</td><td style="padding:8px;border:1px solid #e5e7eb;">${escape(organization)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Phone</td><td style="padding:8px;border:1px solid #e5e7eb;">${escape(phone || "—")}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Tournaments / year</td><td style="padding:8px;border:1px solid #e5e7eb;">${escape(tournamentsPerYear || "—")}</td></tr>
        </table>
        <h3 style="margin-top:20px;">Notes</h3>
        <p style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:6px;">${escape(notes || "(none)")}</p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: SENDER,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `Enterprise inquiry — ${organization}`,
        html,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Resend error: ${t}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
