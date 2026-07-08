import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

const DEFAULT_SUBJECT = "Your ticket for {{event_title}}";
const DEFAULT_BODY = `Hi {{buyer_name}},

Thanks for your purchase! Your registration for {{event_title}} is confirmed.

Tickets: {{quantity}} × {{tier_name}}
Total: {{total}}
When: {{event_date}}{{event_time_line}}
Where: {{event_location}}

We look forward to seeing you there.

— The TeeVents Team`;

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ""));
}

function textToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(/\n/g, "<br/>");
}

async function sendConfirmationEmail(admin: any, purchaseId: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("[verify-event-ticket] RESEND_API_KEY not set, skipping email");
    return;
  }
  try {
    const { data: p } = await admin
      .from("event_ticket_purchases")
      .select("id, buyer_name, buyer_email, quantity, total_cents, event_id, tier_id")
      .eq("id", purchaseId)
      .maybeSingle();
    if (!p) return;
    const { data: ev } = await admin
      .from("public_events")
      .select("event_title, event_date, event_time, location, confirmation_email_subject, confirmation_email_body")
      .eq("id", p.event_id)
      .maybeSingle();
    const { data: tier } = await admin
      .from("event_ticket_tiers")
      .select("tier_name")
      .eq("id", p.tier_id)
      .maybeSingle();
    if (!ev) return;

    const vars: Record<string, string> = {
      buyer_name: p.buyer_name || "Guest",
      event_title: ev.event_title || "your event",
      event_date: ev.event_date ? new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "",
      event_time_line: ev.event_time ? ` at ${String(ev.event_time).slice(0, 5)}` : "",
      event_location: ev.location || "TBA",
      quantity: String(p.quantity),
      tier_name: tier?.tier_name || "General",
      total: `$${(p.total_cents / 100).toFixed(2)}`,
    };

    const subject = renderTemplate(ev.confirmation_email_subject || DEFAULT_SUBJECT, vars);
    const bodyText = renderTemplate(ev.confirmation_email_body || DEFAULT_BODY, vars);
    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f4f4f5;padding:24px;">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#1a5c38;padding:20px;color:#fff;text-align:center;">
      <h2 style="margin:0;font-family:Georgia,serif;">${vars.event_title}</h2>
    </div>
    <div style="padding:24px;color:#374151;line-height:1.6;font-size:15px;">
      ${textToHtml(bodyText)}
    </div>
  </div>
</body></html>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
        to: [p.buyer_email],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("[verify-event-ticket] email send failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Free registration path (no Stripe)
    if (body.free_registration) {
      const { event_id, tier_id, quantity, buyer_name, buyer_email, buyer_answers } = body;
      const qty = Math.max(1, Math.min(20, Number(quantity) || 1));
      if (!event_id || !tier_id || !buyer_email) throw new Error("Missing required fields");

      const { data: tier } = await admin
        .from("event_ticket_tiers")
        .select("id, event_id, price_cents, max_quantity, sold_quantity")
        .eq("id", tier_id)
        .eq("event_id", event_id)
        .maybeSingle();
      if (!tier) throw new Error("Ticket tier not found");
      if (tier.price_cents > 0) throw new Error("This tier requires payment");
      const remaining = tier.max_quantity == null ? Infinity : tier.max_quantity - (tier.sold_quantity || 0);
      if (remaining < qty) throw new Error("Not enough tickets remaining");

      const { data: event } = await admin
        .from("public_events")
        .select("id, status")
        .eq("id", event_id)
        .maybeSingle();
      if (!event || event.status !== "published") throw new Error("Event not available");

      const { data: purchase, error: pErr } = await admin
        .from("event_ticket_purchases")
        .insert({
          event_id,
          tier_id,
          buyer_name: buyer_name || null,
          buyer_email,
          quantity: qty,
          total_cents: 0,
          payment_status: "paid",
          buyer_answers: buyer_answers || {},
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      await admin.rpc("increment_event_ticket_sold", { _tier_id: tier_id, _qty: qty });
      await sendConfirmationEmail(admin, purchase.id);

      return new Response(JSON.stringify({ paid: true, free: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Paid Stripe verification path
    const { session_id } = body;
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === "paid";

    const { data: purchase } = await admin
      .from("event_ticket_purchases")
      .select("id, tier_id, quantity, payment_status")
      .eq("stripe_session_id", session_id)
      .maybeSingle();

    if (!purchase) throw new Error("Purchase not found");

    if (paid && purchase.payment_status !== "paid") {
      await admin
        .from("event_ticket_purchases")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", purchase.id);

      await admin.rpc("increment_event_ticket_sold", {
        _tier_id: purchase.tier_id,
        _qty: purchase.quantity,
      });

      await sendConfirmationEmail(admin, purchase.id);
    }

    return new Response(
      JSON.stringify({ paid, payment_status: session.payment_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
