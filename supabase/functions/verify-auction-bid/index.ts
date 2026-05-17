// GET endpoint hit from the magic-link email. Marks bid verified and, if it's the
// new highest verified bid, updates the auction's current_bid + applies auto-extend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function htmlResponse(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Bid confirmation</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;padding:40px;border-radius:12px;max-width:480px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center}
    h1{color:#1a5c38;margin:0 0 16px}p{color:#555;line-height:1.6}</style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return htmlResponse("<h1>Invalid link</h1><p>Missing token.</p>", 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: bid } = await supabaseAdmin
      .from("auction_bids")
      .select("id, auction_id, bid_amount_cents, verified, bidder_name")
      .eq("verify_token", token)
      .maybeSingle();
    if (!bid) return htmlResponse("<h1>Invalid link</h1><p>This bid confirmation link is not valid.</p>", 404);
    if (bid.verified) {
      return htmlResponse("<h1>Already confirmed</h1><p>Your bid was already confirmed. Good luck!</p>");
    }

    await supabaseAdmin
      .from("auction_bids")
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq("id", bid.id);

    // Fetch auction + highest verified bid
    const { data: auction } = await supabaseAdmin
      .from("auctions")
      .select("id, item_name, status, end_time, current_bid_cents, auto_extend_minutes")
      .eq("id", bid.auction_id)
      .single();
    if (!auction) return htmlResponse("<h1>Auction not found</h1>");

    const { data: top } = await supabaseAdmin
      .from("auction_bids")
      .select("bid_amount_cents")
      .eq("auction_id", bid.auction_id)
      .eq("verified", true)
      .order("bid_amount_cents", { ascending: false })
      .limit(1)
      .maybeSingle();

    const updates: any = {};
    if (top && top.bid_amount_cents > (auction.current_bid_cents || 0)) {
      updates.current_bid_cents = top.bid_amount_cents;
    }
    // Auto-extend: if active, end_time exists, and end_time - now < 1 minute
    if (
      auction.status === "active" &&
      auction.end_time &&
      auction.auto_extend_minutes > 0
    ) {
      const endMs = new Date(auction.end_time).getTime();
      const remaining = endMs - Date.now();
      if (remaining > 0 && remaining < 60_000) {
        updates.end_time = new Date(endMs + auction.auto_extend_minutes * 60_000).toISOString();
      }
    }
    if (Object.keys(updates).length) {
      await supabaseAdmin.from("auctions").update(updates).eq("id", auction.id);
    }

    return htmlResponse(
      `<h1>Bid confirmed!</h1><p>Thanks ${bid.bidder_name}, your bid on <strong>${auction.item_name}</strong> is now live. We'll email you if you win.</p>`,
    );
  } catch (e) {
    console.error(e);
    return htmlResponse("<h1>Something went wrong</h1><p>Please try again or contact the organizer.</p>", 500);
  }
});
