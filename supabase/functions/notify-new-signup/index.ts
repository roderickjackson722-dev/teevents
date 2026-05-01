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
    const { email } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TeeVents Golf Management <notifications@notifications.teevents.golf>",
        to: ["info@teevents.golf"],
        subject: "🆕 New Free Platform Signup",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a5c38;">New Free Platform User</h2>
            <p>A new tournament organizer has signed up for the <strong>Free (Base) Platform</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Email</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Plan</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">Base (Free – 5% platform fee per transaction)</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold; background: #f9fafb;">Date</td>
                <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">You can view this user in the Admin Dashboard → All User Tournaments.</p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
