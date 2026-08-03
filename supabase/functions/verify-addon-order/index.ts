import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, buildNotificationHtml } from "../_shared/notify.ts";
import { notifyPlatformFallbackForConfirmedSession } from "../_shared/connectRouting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function sendBuyerEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "TeeVents <info@notifications.teevents.golf>",
      to: [to],
      reply_to: "info@teevents.golf",
      subject,
      html,
    }),
  });
}

/**
 * verify-addon-order
 * Body: { session_id: string, acct?: string }
 * Confirms a standalone add-on purchase, marks the order paid, and sends
 * confirmation (buyer) + notification (organizer) emails once.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, acct } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.retrieve(
      session_id,
      acct ? { stripeAccount: String(acct) } : undefined,
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await supabaseAdmin
      .from("tournament_addon_orders")
      .select("*")
      .eq("stripe_session_id", session_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ verified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alreadyPaid = order.payment_status === "paid";
    if (!alreadyPaid) {
      await supabaseAdmin
        .from("tournament_addon_orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id);
    }

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, custom_slug, organization_id, date, location")
      .eq("id", order.tournament_id)
      .maybeSingle();

    const items = (order.items as any[]) || [];
    const itemsHtml = items
      .map((i) => `<li>${i.quantity} × ${i.name} — ${money((i.unit_price_cents || 0) * (i.quantity || 1))}</li>`)
      .join("");

    if (!alreadyPaid) {
      try {
        await sendBuyerEmail(
          order.buyer_email,
          `✅ Add-On Purchase Confirmed — ${tournament?.title || "Your Tournament"}`,
          `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1a5c38;color:#fff;padding:20px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">Add-On Purchase Confirmed 🎉</h2>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
              <p>Thanks${order.buyer_name ? `, ${order.buyer_name}` : ""}! Your add-ons for
              <strong>${tournament?.title || "the tournament"}</strong> are confirmed.</p>
              <ul>${itemsHtml}</ul>
              <p><strong>Total paid: ${money(order.total_cents || 0)}</strong></p>
              <p style="color:#6b7280;font-size:13px">Show this email at check-in to claim your add-ons.</p>
            </div>
          </div>`,
        );
      } catch (e) {
        console.error("[verify-addon-order] buyer email failed:", e);
      }

      try {
        await sendNotificationEmails(
          supabaseAdmin,
          tournament?.organization_id,
          "notify_registration",
          `🛒 Add-On Purchase — ${tournament?.title || "Tournament"}`,
          buildNotificationHtml(
            "New Add-On Purchase 🛒",
            [
              `<strong>${order.buyer_name || order.buyer_email}</strong> purchased add-ons for <strong>${tournament?.title || "your tournament"}</strong>.`,
              `📧 ${order.buyer_email}`,
              `💵 Total: ${money(order.total_cents || 0)}`,
            ],
            `<ul>${itemsHtml}</ul>`,
          ),
          tournament?.id,
        );
      } catch (e) {
        console.error("[verify-addon-order] organizer notification failed:", e);
      }

      await notifyPlatformFallbackForConfirmedSession(supabaseAdmin, session_id, {
        context: "addon_purchase",
        tournamentTitle: tournament?.title ?? null,
        buyerEmail: order.buyer_email,
      });
    }

    return new Response(
      JSON.stringify({ verified: true, order: { ...order, payment_status: "paid" } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[verify-addon-order] ERROR:", (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
