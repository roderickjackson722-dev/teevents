// Cron: find raffles past draw_time and randomly draw a winner.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  const { data: due } = await supabaseAdmin
    .from("raffles")
    .select("id, item_name")
    .eq("status", "active")
    .lte("draw_time", new Date().toISOString());

  let processed = 0;
  for (const r of due || []) {
    const { data: tickets } = await supabaseAdmin
      .from("raffle_tickets")
      .select("ticket_number, buyer_name, buyer_email")
      .eq("raffle_id", r.id);

    if (!tickets || tickets.length === 0) {
      await supabaseAdmin.from("raffles").update({ status: "drawn" }).eq("id", r.id);
      continue;
    }

    const winner = tickets[Math.floor(Math.random() * tickets.length)];
    await supabaseAdmin
      .from("raffles")
      .update({
        status: "drawn",
        winner_ticket_number: winner.ticket_number,
        winner_name: winner.buyer_name,
        winner_email: winner.buyer_email,
        winner_notified_at: new Date().toISOString(),
      })
      .eq("id", r.id);

    if (RESEND_API_KEY && winner.buyer_email) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1a1a1a">
          <h2 style="color:#1a5c38">You won the raffle!</h2>
          <p>Hi ${winner.buyer_name}, your ticket <strong>#${winner.ticket_number}</strong> was drawn for <strong>${r.item_name}</strong>.</p>
          <p>The event organizer will reach out shortly to arrange your prize.</p>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TeeVents Raffle <info@teevents.golf>",
          to: [winner.buyer_email],
          subject: `You won the raffle: ${r.item_name}`,
          html,
        }),
      }).catch((e) => console.error("[raffle-auto-draw] email error:", e));
    }
    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { "Content-Type": "application/json" },
  });
});
