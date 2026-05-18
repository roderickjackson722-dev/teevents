import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYMENT_KEYWORDS = ["venmo", "cash app", "cashapp", "zelle", "paypal", "check", "cash", "money order"];
const EVENTBRITE_KEYWORDS = ["eventbrite", "eventbrite.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    try { await requireAdmin(req); }
    catch (r) { if (r instanceof Response) { const body = await r.text(); return new Response(body, { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); } throw r; }

    const { image_base64, image_url } = await req.json();
    if (!image_base64 && !image_url) {
      return new Response(JSON.stringify({ error: "image_base64 or image_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContent = image_url
      ? { type: "image_url", image_url: { url: image_url } }
      : { type: "image_url", image_url: { url: image_base64 } };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract golf tournament information from event flyers for sales prospecting. Be concise and accurate. Return null for any field not visible." },
          { role: "user", content: [
            { type: "text", text: "Extract tournament info and any payment-related keywords (Venmo, Cash App, Zelle, PayPal, check, cash, Eventbrite) visible on this flyer." },
            imageContent,
          ]},
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_flyer",
            description: "Return structured tournament data from the flyer.",
            parameters: {
              type: "object",
              properties: {
                tournament_name: { type: ["string", "null"] },
                organizer_name: { type: ["string", "null"] },
                date: { type: ["string", "null"], description: "Date as visible on flyer or YYYY-MM-DD if obvious" },
                location: { type: ["string", "null"] },
                fee: { type: ["string", "null"], description: "Entry fee text e.g. '$400 per team'" },
                contact_email: { type: ["string", "null"] },
                contact_phone: { type: ["string", "null"] },
                payment_keywords: { type: "array", items: { type: "string" } },
                raw_text: { type: "string" },
              },
              required: ["raw_text", "payment_keywords"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_flyer" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error", aiResponse.status, t);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured data" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(toolCall.function.arguments); } catch {
      return new Response(JSON.stringify({ error: "Parse failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fallback keyword scan
    const haystack = `${parsed.raw_text || ""}`.toLowerCase();
    const found = new Set<string>((parsed.payment_keywords || []).map((s: string) => s.toLowerCase()));
    for (const kw of PAYMENT_KEYWORDS) if (haystack.includes(kw)) found.add(kw);
    let detected_setup: "eventbrite" | "manual" | "unknown" = "unknown";
    if (EVENTBRITE_KEYWORDS.some(k => haystack.includes(k))) detected_setup = "eventbrite";
    else if (found.size > 0) detected_setup = "manual";

    return new Response(JSON.stringify({
      success: true,
      data: {
        tournament_name: parsed.tournament_name ?? null,
        organizer_name: parsed.organizer_name ?? null,
        date: parsed.date ?? null,
        location: parsed.location ?? null,
        fee: parsed.fee ?? null,
        contact_email: parsed.contact_email ?? null,
        contact_phone: parsed.contact_phone ?? null,
        payment_keywords: Array.from(found),
        detected_setup,
        raw_text: parsed.raw_text ?? "",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
