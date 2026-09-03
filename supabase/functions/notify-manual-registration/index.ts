// Sends organizer + platform-admin emails when a player registration is
// manually added by the organizer (offline / cash / check). Also records a
// platform_transactions row when the manual entry is marked paid so it shows
// up on the Finances dashboard. Idempotent via metadata->>manual_registration_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml, buildRegistrationAnswersHtml } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { registration_id } = await req.json();
    if (!registration_id || typeof registration_id !== "string") {
      return new Response(JSON.stringify({ error: "registration_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: reg } = await supabaseAdmin
      .from("tournament_registrations")
      .select("*")
      .eq("id", registration_id)
      .maybeSingle() as any;
    if (!reg) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id, registration_fee_cents")
      .eq("id", reg.tournament_id)
      .maybeSingle() as any;
    if (!tournament?.organization_id) {
      return new Response(JSON.stringify({ error: "no tournament" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gross = Number(tournament.registration_fee_cents || 0);
    const isPaid = reg.payment_status === "paid";
    const method = String(reg.payment_method || "manual");
    const paymentLabel = method === "check" ? "Check" : method === "cash" ? "Cash" : "Manual / Offline";

    // Idempotently record a platform_transactions row if paid
    if (isPaid && gross > 0) {
      const { data: existingTx } = await supabaseAdmin
        .from("platform_transactions")
        .select("id")
        .eq("tournament_id", tournament.id)
        .filter("metadata->>manual_registration_id", "eq", registration_id)
        .maybeSingle() as any;

      if (!existingTx) {
        await supabaseAdmin.from("platform_transactions").insert({
          organization_id: tournament.organization_id,
          tournament_id: tournament.id,
          amount_cents: gross,
          platform_fee_cents: 0,
          stripe_fee_cents: 0,
          net_amount_cents: gross,
          type: "registration",
          status: "succeeded",
          description: `Registration (manual/offline) — ${reg.first_name || ""} ${reg.last_name || ""}`.trim(),
          metadata: {
            manual_registration_id: registration_id,
            player_email: reg.email,
            payment_channel: paymentLabel.toLowerCase(),
            source: "manual_add",
          },
        });
      }
    }

    const playerName = `${reg.first_name || ""} ${reg.last_name || ""}`.trim() || "Player";
    const paymentLine = isPaid
      ? `💰 Amount marked received: <strong>$${(gross / 100).toFixed(2)}</strong> (${paymentLabel})`
      : `💰 Payment status: <strong>Pending</strong> — <strong>payment must be collected manually</strong> by the organizer.`;

    const answersHtml = await buildRegistrationAnswersHtml(supabaseAdmin, [registration_id]);

    // Organizer notification
    await sendNotificationEmails(
      supabaseAdmin,
      tournament.organization_id,
      "notify_registration",
      `Manual Add-On — ${playerName} — ${tournament.title || "Tournament"}`,
      buildNotificationHtml("Player Added Manually", [
        `🏌️ <strong>${playerName}</strong> was added manually to <strong>${tournament.title || "your tournament"}</strong>.`,
        reg.email ? `📧 ${reg.email}${reg.phone ? ` • 📱 ${reg.phone}` : ""}` : "",
        paymentLine,
        `<em>This entry did not go through online checkout. Payment is being handled offline (cash, check, or invoice) and must be collected manually.</em>`,
      ].filter(Boolean) as string[], answersHtml),
      tournament.id,
    );

    // Platform admin (info@teevents.golf) intentionally NOT notified for
    // registration events — admin only receives payout notifications.

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-manual-registration] failed:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
