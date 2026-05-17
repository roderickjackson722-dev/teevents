// Cron: find auctions past end_time and finalize them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const { data: due } = await supabaseAdmin
    .from("auctions")
    .select("id, item_name, current_bid_cents")
    .eq("status", "active")
    .lte("end_time", new Date().toISOString());

  let processed = 0;
  for (const a of due || []) {
    // Find highest verified bid
    const { data: top } = await supabaseAdmin
      .from("auction_bids")
      .select("bidder_name, bidder_email, bid_amount_cents")
      .eq("auction_id", a.id)
      .eq("verified", true)
      .order("bid_amount_cents", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin
      .from("auctions")
      .update({
        status: "ended",
        winning_bidder_name: top?.bidder_name || null,
        winning_bidder_email: top?.bidder_email || null,
        winning_bid_amount_cents: top?.bid_amount_cents || null,
        winner_notified_at: top ? new Date().toISOString() : null,
      })
      .eq("id", a.id);

    if (top && RESEND_API_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1a1a1a">
          <h2 style="color:#1a5c38">You won!</h2>
          <p>Hi ${top.bidder_name}, congratulations — you won the auction for <strong>${a.item_name}</strong> with a bid of <strong>$${(top.bid_amount_cents / 100).toFixed(2)}</strong>.</p>
          <p>The event organizer will reach out shortly to arrange payment and pickup.</p>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Auctions <notifications@notifications.teevents.golf>",
          to: [top.bidder_email],
          subject: `You won: ${a.item_name}`,
          html,
        }),
      }).catch((e) => console.error("[auction-auto-end] email error:", e));
    }
    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
