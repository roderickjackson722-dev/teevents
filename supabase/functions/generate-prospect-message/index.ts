import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tournament_name, organizer_name, event_date, location, kind } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const isFollowUp = kind === "followup";

    const system = `You are a friendly sales assistant for TeeVents, a golf tournament management platform.
Write a short personal message (under 130 words) to a tournament organizer.
Tone: warm, casual, not salesy. No emojis. No bullet lists.
TeeVents offers: pro tournament website, online registration & payments (Stripe, Apple Pay), live leaderboard & scoring, sponsor management, volunteer check-in, automatic payouts. Free to start.
Goal: get a reply and book a 15-minute demo.
Sign off as "— Tom from TeeVents".`;

    const user = isFollowUp
      ? `Write a gentle follow-up. Organizer: ${organizer_name || "there"}. Tournament: ${tournament_name || "your event"}. Acknowledge they're busy, no pressure, offer help, wish them luck.`
      : `Write the first outreach message.
Organizer name: ${organizer_name || "(unknown — use a friendly opener like 'Hi there')"}
Tournament name: ${tournament_name || "(unknown)"}
Date: ${event_date || "(unknown)"}
Location: ${location || "(unknown)"}
Mention the event by name if known. Ask one question about how they currently handle registrations/payments. Offer a 15-min demo.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const message = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
