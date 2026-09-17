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
    // Use service role to access all scheduled messages
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Recover messages left in 'processing' by a previous run that timed out (>15 min).
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabase
      .from("tournament_messages")
      .update({ status: "scheduled" })
      .eq("status", "processing")
      .lte("scheduled_for", staleCutoff);

    // Find all scheduled messages that are due
    const { data: dueMessages, error: fetchError } = await supabase
      .from("tournament_messages")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(20);

    if (fetchError) throw new Error(`Failed to fetch scheduled messages: ${fetchError.message}`);
    if (!dueMessages || dueMessages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!accountSid || !authToken || !fromPhone) throw new Error("Twilio credentials not configured");

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);

    let totalProcessed = 0;
    const startedAt = Date.now();
    const TIME_BUDGET_MS = 90_000; // stop before the worker wall-clock limit
    const BATCH_SIZE = 10; // concurrent Twilio requests

    for (const msg of dueMessages) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break; // remaining rows stay 'scheduled'

      // Mark as processing to prevent duplicate sends
      await supabase
        .from("tournament_messages")
        .update({ status: "processing" })
        .eq("id", msg.id);


      // Fetch recipients
      const { data: registrations } = await supabase
        .from("tournament_registrations")
        .select("first_name, last_name, phone")
        .eq("tournament_id", msg.tournament_id)
        .not("phone", "is", null);

      const recipients = (registrations || []).filter(
        (r: any) => r.phone && r.phone.trim() !== ""
      );

      let successCount = 0;
      let failCount = 0;
      let timedOut = false;

      const sendOne = async (recipient: any) => {
        try {
          const body = new URLSearchParams({ To: recipient.phone, From: fromPhone, Body: msg.body });
          const res = await fetch(twilioUrl, {
            method: "POST",
            headers: { Authorization: `Basic ${twilioAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });
          if (res.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      };

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        if (Date.now() - startedAt > TIME_BUDGET_MS) {
          timedOut = true;
          break;
        }
        await Promise.all(recipients.slice(i, i + BATCH_SIZE).map(sendOne));
      }

      await supabase
        .from("tournament_messages")
        .update({
          status: timedOut || failCount > 0 ? "partial" : "sent",
          recipient_count: successCount,
          sent_at: new Date().toISOString(),
        })
        .eq("id", msg.id);

      totalProcessed++;
    }

    return new Response(
      JSON.stringify({ processed: totalProcessed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing scheduled SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
