// Public bid submission with email-magic-link verification.
// The bid is inserted as `verified=false`. A verification email is sent to the bidder.
// When clicked, verify-auction-bid marks it verified and updates the auction's current_bid
// (and applies auto-extend) if it is now the highest verified bid.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { auction_id, bidder_name, bidder_email, bidder_phone, bid_amount } = await req.json();
    if (!auction_id || !bidder_name || !bidder_email || typeof bid_amount !== "number") {
      throw new Error("Missing required fields.");
    }
    const email = String(bidder_email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email address.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: auction, error: aErr } = await supabaseAdmin
      .from("auctions")
      .select("id, item_name, status, end_time, current_bid_cents, starting_bid_cents, minimum_increment_cents, tournament_id")
      .eq("id", auction_id)
      .single();
    if (aErr || !auction) throw new Error("Auction not found.");
    if (auction.status !== "active") throw new Error("This auction is no longer active.");
    if (auction.end_time && new Date(auction.end_time).getTime() < Date.now()) {
      throw new Error("This auction has ended.");
    }

    const bidCents = Math.round(bid_amount * 100);
    const minNext = (auction.current_bid_cents ?? auction.starting_bid_cents ?? 0) +
      (auction.current_bid_cents != null ? (auction.minimum_increment_cents || 100) : 0);
    if (bidCents < minNext) {
      throw new Error(`Minimum bid is $${(minNext / 100).toFixed(2)}.`);
    }

    const { data: bid, error: bErr } = await supabaseAdmin
      .from("auction_bids")
      .insert({
        auction_id,
        bidder_name: String(bidder_name).slice(0, 200),
        bidder_email: email,
        bidder_phone: bidder_phone ? String(bidder_phone).slice(0, 50) : null,
        bid_amount_cents: bidCents,
      })
      .select("id, verify_token")
      .single();
    if (bErr || !bid) throw bErr || new Error("Failed to record bid.");

    // Send magic-link verification email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const projectRef = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1];
    const verifyUrl = `https://${projectRef}.supabase.co/functions/v1/verify-auction-bid?token=${bid.verify_token}`;

    if (RESEND_API_KEY) {
      const escHtml = (s: string) => String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1a1a1a">
          <h2 style="color:#1a5c38">Confirm your bid</h2>
          <p>Hi ${escHtml(bidder_name)},</p>
          <p>You placed a bid of <strong>$${(bidCents / 100).toFixed(2)}</strong> on <strong>${escHtml(auction.item_name)}</strong>.</p>
          <p>To confirm your bid, click the button below:</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${verifyUrl}" style="background:#F5A623;color:#1a5c38;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Confirm My Bid</a>
          </p>
          <p style="color:#666;font-size:13px">If you didn't place this bid, you can safely ignore this email.</p>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Auctions <info@teevents.golf>",
          to: [email],
          subject: `Confirm your bid on ${auction.item_name}`,
          html,
        }),
      }).catch((e) => console.error("[place-auction-bid] email error:", e));
    }

    return new Response(JSON.stringify({ ok: true, message: "Check your email to confirm your bid." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
