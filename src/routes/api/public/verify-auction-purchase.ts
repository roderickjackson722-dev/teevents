// Closes an auction "Buy Now" only after Stripe confirms the checkout session
// was paid. The session must live on the tournament organizer's connected
// account (or the platform account) and its metadata must name the same item.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", ...cors } });

async function handle(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.session_id || "");
    const auctionId = body?.auction_id ? String(body.auction_id) : null;
    const itemId = body?.item_id ? String(body.item_id) : null;
    if (!sessionId.startsWith("cs_") || sessionId.length > 300) return json({ error: "Invalid session" }, 400);
    if (!auctionId && !itemId) return json({ error: "Missing item" }, 400);

    const admin = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
      auth: { persistSession: false },
    });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] || "", { apiVersion: "2025-08-27.basil" as any });

    let tournamentId: string;
    let expectedCents: number;
    if (auctionId) {
      const { data: a } = await admin.from("auctions").select("id, tournament_id, status, buy_now_cents").eq("id", auctionId).maybeSingle();
      if (!a) return json({ error: "Not found" }, 404);
      if (a.status !== "active") return json({ ok: true, already: true });
      tournamentId = a.tournament_id; expectedCents = a.buy_now_cents || 0;
    } else {
      const { data: it } = await admin.from("tournament_auction_items").select("id, tournament_id, is_active, buy_now_price").eq("id", itemId!).maybeSingle();
      if (!it) return json({ error: "Not found" }, 404);
      if (!it.is_active) return json({ ok: true, already: true });
      tournamentId = it.tournament_id; expectedCents = Math.round(Number(it.buy_now_price || 0) * 100);
    }
    const { data: t } = await admin.from("tournaments").select("organization_id").eq("id", tournamentId).maybeSingle();
    const { data: org } = t?.organization_id
      ? await admin.from("organizations").select("stripe_account_id").eq("id", t.organization_id).maybeSingle()
      : { data: null as any };

    // Only the organizer's own connected account or the platform account are trusted.
    let session: any = null;
    if (org?.stripe_account_id) {
      try { session = await stripe.checkout.sessions.retrieve(sessionId, undefined, { stripeAccount: org.stripe_account_id }); } catch { session = null; }
    }
    if (!session) session = await stripe.checkout.sessions.retrieve(sessionId);
    const md = (session.metadata || {}) as Record<string, string>;
    const matches = auctionId
      ? md.type === "auction_buy_now_v2" && md.auction_id === auctionId
      : md.type === "auction_buy_now" && md.item_id === itemId;
    if (!matches || md.tournament_id !== tournamentId) return json({ error: "Session does not match" }, 400);
    if (session.payment_status !== "paid") return json({ error: "Payment not completed" }, 402);
    if (!expectedCents || (session.amount_total ?? 0) < expectedCents) return json({ error: "Amount mismatch" }, 400);

    const buyerName = md.buyer_name || null;
    const buyerEmail = md.buyer_email || session.customer_details?.email || null;
    if (auctionId) {
      await admin.from("auctions").update({
        status: "ended", winning_bidder_name: buyerName, winning_bidder_email: buyerEmail, winning_bid_amount_cents: expectedCents,
      }).eq("id", auctionId).eq("status", "active");
    } else {
      await admin.from("tournament_auction_items").update({ is_active: false, winner_name: buyerName, winner_email: buyerEmail })
        .eq("id", itemId!).eq("is_active", true);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("[verify-auction-purchase]", e);
    return json({ error: "Could not verify payment" }, 500);
  }
}

export const Route = createFileRoute("/api/public/verify-auction-purchase")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { headers: cors }),
      POST: ({ request }) => handle(request),
    },
  },
});
