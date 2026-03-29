import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, tournament_title, tournament_id, waitlist_id } = await req.json();

    if (!email || !name || !tournament_title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const siteUrl = supabaseUrl.replace(".supabase.co", "").replace("https://", "https://");

    const claimUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/t/${tournament_id}?claim=${waitlist_id}`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a5c38, #2d8a5e); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 A Spot Opened Up!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Hi ${name},</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Great news! A spot has opened up for <strong>${tournament_title}</strong>.
          </p>
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 600;">
              ⏰ You have 24 hours to claim your spot
            </p>
            <p style="color: #92400E; font-size: 13px; margin: 8px 0 0 0;">
              After that, it will be offered to the next person on the waitlist.
            </p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${claimUrl}" style="display: inline-block; background: #c8a84e; color: #1a5c38; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
              Claim Your Spot →
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you can no longer attend, simply ignore this email and the spot will go to the next person.
          </p>
        </div>
        <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">
          Sent by TeeVents • Golf Tournament Management
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TeeVents <notifications@notifications.teevents.golf>",
        to: [email],
        bcc: ["info@teevents.golf"],
        subject: `🎉 A spot opened up for ${tournament_title}!`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
