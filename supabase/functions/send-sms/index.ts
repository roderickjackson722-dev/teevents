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

    const { tournament_id, message, scheduled_for, to_phones, test } = await req.json();
    if (!tournament_id || !message) {
      return new Response(
        JSON.stringify({ error: "tournament_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SMS is a paid add-on: verify it is enabled and that credits remain.
    const { data: smsSettings } = await supabase
      .from("tournaments")
      .select("sms_enabled, sms_plan, sms_credits_used, sms_credits_limit")
      .eq("id", tournament_id)
      .maybeSingle();

    const smsUnlimited = (smsSettings as any)?.sms_plan === "unlimited";
    const creditsUsed = Number((smsSettings as any)?.sms_credits_used ?? 0);
    const creditsLimit = Number((smsSettings as any)?.sms_credits_limit ?? 0);
    const creditsRemaining = smsUnlimited ? Infinity : Math.max(0, creditsLimit - creditsUsed);

    if (!(smsSettings as any)?.sms_enabled) {
      return new Response(
        JSON.stringify({ error: "Text messaging is not enabled for this tournament" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (creditsRemaining <= 0) {
      return new Response(
        JSON.stringify({ error: "No text messages remaining on your plan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual numbers (test sends or ad-hoc recipients) skip the roster lookup.
    const manualPhones: string[] = Array.isArray(to_phones)
      ? to_phones.map((p: string) => String(p).trim()).filter(Boolean)
      : [];
    const isTest = !!test;


    // If scheduling for later, just insert the record and return
    if (scheduled_for) {
      const scheduledDate = new Date(scheduled_for);
      if (scheduledDate <= new Date()) {
        return new Response(
          JSON.stringify({ error: "Scheduled time must be in the future" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count recipients for display
      const { count } = await supabase
        .from("tournament_registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament_id)
        .not("phone", "is", null)
        .neq("phone", "");

      await supabase.from("tournament_messages").insert({
        tournament_id,
        body: message,
        recipient_count: count || 0,
        status: "scheduled",
        scheduled_for: scheduled_for,
      });

      return new Response(
        JSON.stringify({ success: true, scheduled: true, scheduled_for }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send immediately
    let recipients: any[] = [];
    if (manualPhones.length > 0) {
      recipients = manualPhones.map((phone) => ({
        first_name: isTest ? "Test" : "Manual",
        last_name: phone,
        phone,
      }));
    } else {
      const { data: registrations, error: regError } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", tournament_id)
        .not("phone", "is", null);

      if (regError) throw new Error(`Failed to fetch registrations: ${regError.message}`);

      recipients = (registrations || []).filter(
        (r: any) => r.phone && r.phone.trim() !== ""
      );
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No registered players with phone numbers found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Never send more texts than the plan allows.
    let skippedForCredits = 0;
    if (!smsUnlimited && recipients.length > creditsRemaining) {
      skippedForCredits = recipients.length - creditsRemaining;
      recipients = recipients.slice(0, creditsRemaining);
    }


    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!accountSid || !authToken || !fromPhone) throw new Error("Twilio credentials not configured");

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const twilioAuth = btoa(`${accountSid}:${authToken}`);

    // Tournament-level values for message variables.
    const { data: tourn } = await supabase
      .from("tournaments")
      .select("title, course_name, date, slug")
      .eq("id", tournament_id)
      .maybeSingle();
    const t: any = tourn || {};
    const leaderboardLink = t.slug ? `https://www.teevents.golf/live/${t.slug}` : "https://www.teevents.golf";

    const personalize = (tpl: string, r: any) => {
      const map: Record<string, string> = {
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        tournament_name: t.title ?? "",
        course_name: t.course_name ?? "",
        event_date: t.date ?? "",
        tee_time: r.tee_time ?? r.starting_tee_time ?? "",
        starting_hole: r.starting_hole != null ? String(r.starting_hole) : (r.group_number != null ? String(r.group_number) : ""),
        team_name: r.team_name ?? "",
        scoring_code: r.scoring_code ?? "",
        leaderboard_link: leaderboardLink,
      };
      return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in map ? map[key] : m));
    };

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        const body = new URLSearchParams({
          To: recipient.phone,
          From: fromPhone,
          Body: personalize(message, recipient),
        });
        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: { Authorization: `Basic ${twilioAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (res.ok) { successCount++; }
        else {
          const errData = await res.json();
          failCount++;
          errors.push(`${recipient.first_name} ${recipient.last_name}: ${errData.message || res.statusText}`);
        }
      } catch (e) {
        failCount++;
        errors.push(`${recipient.first_name} ${recipient.last_name}: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }

    // Every text that actually went out burns a credit on the tournament's plan.
    if (successCount > 0 && !smsUnlimited) {
      await supabase
        .from("tournaments")
        .update({ sms_credits_used: creditsUsed + successCount })
        .eq("id", tournament_id);
    }

    // Test sends stay out of the message history.
    if (!isTest) {
      await supabase.from("tournament_messages").insert({
        tournament_id,
        body: message,
        recipient_count: successCount,
        status: failCount === 0 ? "sent" : "partial",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        skipped_no_credits: skippedForCredits || undefined,
        credits_remaining: smsUnlimited ? null : Math.max(0, creditsLimit - (creditsUsed + successCount)),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
