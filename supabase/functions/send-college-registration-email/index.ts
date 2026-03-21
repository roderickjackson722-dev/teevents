import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "No email configuration" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tournament_title, school_name, coach_name, coach_email, player_count, contact_email } = await req.json();

    // Send confirmation to coach
    const coachHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #f5f0e8; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background: #1a5c38; padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 22px; margin: 0;">Registration Confirmed!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333;">Dear Coach ${coach_name},</p>
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        Your team registration for <strong>${tournament_title}</strong> has been received.
      </p>
      <div style="background: #f5f0e8; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>School:</strong> ${school_name}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Players:</strong> ${player_count}</p>
      </div>
      <p style="font-size: 14px; color: #666;">
        If you have any questions, please contact us at <a href="mailto:${contact_email}" style="color: #1a5c38;">${contact_email}</a>.
      </p>
    </div>
    <div style="background: #f5f0e8; padding: 16px; text-align: center;">
      <p style="font-size: 12px; color: #888; margin: 0;">Powered by <a href="https://teevents.lovable.app" style="color: #1a5c38; font-weight: bold; text-decoration: none;">TeeVents</a></p>
    </div>
  </div>
</body>
</html>`;

    // Send to coach
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents <notifications@notifications.teevents.golf>",
        to: [coach_email],
        subject: `Registration Confirmed: ${tournament_title}`,
        html: coachHtml,
      }),
    });

    // Send notification to admin
    const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background: #f5f0e8; padding: 40px 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
    <div style="background: #1a5c38; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">New Team Registration</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #333;">A new team has registered for <strong>${tournament_title}</strong>.</p>
      <div style="background: #f5f0e8; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>School:</strong> ${school_name}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Coach:</strong> ${coach_name}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> ${coach_email}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Players:</strong> ${player_count}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "TeeVents <notifications@notifications.teevents.golf>",
        to: [contact_email],
        subject: `New Registration: ${school_name} - ${tournament_title}`,
        html: adminHtml,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
