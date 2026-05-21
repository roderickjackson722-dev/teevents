// Verify a raffle Stripe Checkout session and issue ticket numbers.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { session_id, stripe_account_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");
    if (!stripe_account_id) throw new Error("Missing stripe_account_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id, { stripeAccount: stripe_account_id });
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ ok: false, status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Idempotency: if any ticket already exists for this session, return them
    const { data: existing } = await supabaseAdmin
      .from("raffle_tickets")
      .select("ticket_number, buyer_name, buyer_email")
      .eq("stripe_session_id", session_id);
    if (existing && existing.length) {
      return new Response(JSON.stringify({ ok: true, tickets: existing.map((r) => r.ticket_number) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const m = session.metadata || {};
    const raffleId = m.raffle_id;
    const qty = Math.max(1, parseInt(m.quantity || "1", 10));
    if (!raffleId) throw new Error("Missing raffle_id in session metadata.");

    // Allocate ticket numbers from current max + 1
    const { data: lastTicket } = await supabaseAdmin
      .from("raffle_tickets")
      .select("ticket_number")
      .eq("raffle_id", raffleId)
      .order("ticket_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const startNum = (lastTicket?.ticket_number || 0) + 1;
    const ticketNumbers: number[] = [];
    const rows = [];
    for (let i = 0; i < qty; i++) {
      const n = startNum + i;
      ticketNumbers.push(n);
      rows.push({
        raffle_id: raffleId,
        ticket_number: n,
        buyer_name: m.buyer_name || "Guest",
        buyer_email: m.buyer_email || "",
        buyer_phone: m.buyer_phone || null,
        stripe_session_id: session_id,
      });
    }
    const { error: insErr } = await supabaseAdmin.from("raffle_tickets").insert(rows);
    if (insErr) throw insErr;

    // Increment tickets_sold
    const { data: raffle } = await supabaseAdmin
      .from("raffles")
      .select("tickets_sold, item_name")
      .eq("id", raffleId)
      .single();
    await supabaseAdmin
      .from("raffles")
      .update({ tickets_sold: (raffle?.tickets_sold || 0) + qty })
      .eq("id", raffleId);

    // Email confirmation
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && m.buyer_email) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1a1a1a">
          <h2 style="color:#1a5c38">You're entered!</h2>
          <p>Hi ${m.buyer_name || "there"}, thanks for buying raffle tickets for <strong>${raffle?.item_name || "our raffle"}</strong>.</p>
          <p>Your ticket number${qty > 1 ? "s" : ""}: <strong>${ticketNumbers.join(", ")}</strong></p>
          <p>We'll email you if your ticket is drawn. Good luck!</p>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Raffle <info@notifications.teevents.golf>",
          to: [m.buyer_email],
          subject: `Your raffle tickets: ${ticketNumbers.join(", ")}`,
          html,
        }),
      }).catch((e) => console.error("[verify-raffle-checkout] email error:", e));
    }

    return new Response(JSON.stringify({ ok: true, tickets: ticketNumbers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
