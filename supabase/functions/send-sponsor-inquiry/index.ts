// Sends a sponsor inquiry email from the public sponsorship landing page
// to the tournament's contact email (with a copy to info@teevents.golf).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InquiryBody {
  tournament_id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
}

const escape = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = (await req.json()) as InquiryBody;
    const { tournament_id, name, email, company, phone, message } = body;

    if (!tournament_id || !name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (name.length > 200 || email.length > 320 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Field too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tournament + sponsorship page contact info via service role
    const tRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tournaments?id=eq.${tournament_id}&select=title,slug,contact_email`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const tournaments = await tRes.json();
    const tournament = tournaments?.[0];
    if (!tournament) throw new Error("Tournament not found");

    const pRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sponsorship_pages?tournament_id=eq.${tournament_id}&select=contact_email,contact_name`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const pages = await pRes.json();
    const page = pages?.[0];

    const recipientEmail =
      (page?.contact_email as string | undefined) ||
      tournament.contact_email ||
      "info@teevents.golf";

    const html = `
      <h2>New Sponsorship Inquiry</h2>
      <p><strong>Tournament:</strong> ${escape(tournament.title)}</p>
      <hr/>
      <p><strong>From:</strong> ${escape(name)} &lt;${escape(email)}&gt;</p>
      ${company ? `<p><strong>Company:</strong> ${escape(company)}</p>` : ""}
      ${phone ? `<p><strong>Phone:</strong> ${escape(phone)}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p>${escape(message).replace(/\n/g, "<br/>")}</p>
      <hr/>
      <p style="color:#888;font-size:12px">Sent from the TeeVents sponsorship page for
      <a href="https://www.teevents.golf/sponsor/${escape(tournament.slug || "")}">${escape(tournament.slug || "")}</a></p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TeeVents <noreply@teevents.golf>",
        to: [recipientEmail],
        cc: ["info@teevents.golf"],
        reply_to: email,
        subject: `Sponsorship inquiry: ${tournament.title}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-sponsor-inquiry error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
