import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tournament_id, message } = await req.json();
    if (!tournament_id || !message) {
      return new Response(
        JSON.stringify({ error: "tournament_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch registrations with phone numbers
    const { data: registrations, error: regError } = await supabase
      .from("tournament_registrations")
      .select("first_name, last_name, phone")
      .eq("tournament_id", tournament_id)
      .not("phone", "is", null);

    if (regError) {
      throw new Error(`Failed to fetch registrations: ${regError.message}`);
    }

    const recipients = (registrations || []).filter(
      (r: any) => r.phone && r.phone.trim() !== ""
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No registered players with phone numbers found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromPhone) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        const body = new URLSearchParams({
          To: recipient.phone,
          From: fromPhone,
          Body: message,
        });

        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (res.ok) {
          successCount++;
        } else {
          const errData = await res.json();
          failCount++;
          errors.push(
            `${recipient.first_name} ${recipient.last_name}: ${errData.message || res.statusText}`
          );
        }
      } catch (e) {
        failCount++;
        errors.push(
          `${recipient.first_name} ${recipient.last_name}: ${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }

    // Log the message
    await supabase.from("tournament_messages").insert({
      tournament_id,
      body: message,
      recipient_count: successCount,
      status: failCount === 0 ? "sent" : "partial",
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
