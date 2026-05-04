import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_url, image_base64 } = await req.json();
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContent = image_url
      ? { type: "image_url", image_url: { url: image_url } }
      : { type: "image_url", image_url: { url: image_base64 } };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at extracting structured tournament details from golf event flyers. Read the image carefully and call the extract_flyer_data tool with the best inferred values. If a field is not visible, return null for it.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract golf tournament details from this flyer.",
              },
              imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_flyer_data",
              description: "Return the structured tournament details from the flyer.",
              parameters: {
                type: "object",
                properties: {
                  tournament_name: {
                    type: ["string", "null"],
                    description: "The full tournament/event name (e.g. 'HBCU Golf Foundation Classic').",
                  },
                  date: {
                    type: ["string", "null"],
                    description: "Tournament date in YYYY-MM-DD format. If only a month/year is shown, pick the 1st.",
                  },
                  course_name: {
                    type: ["string", "null"],
                    description: "Golf course or club name (e.g. 'Pebble Beach Golf Links').",
                  },
                  location: {
                    type: ["string", "null"],
                    description: "Full location string: 'City, ST' or 'Course Name, City, ST'.",
                  },
                  fee_cents: {
                    type: ["integer", "null"],
                    description: "Per-player registration fee in CENTS. $150 → 15000. Null if not shown.",
                  },
                  description: {
                    type: ["string", "null"],
                    description: "Short event description (max 280 chars), if any benefit/cause language is on the flyer.",
                  },
                  contact_email: { type: ["string", "null"] },
                  contact_phone: { type: ["string", "null"] },
                  raw_text: {
                    type: "string",
                    description: "All visible text from the flyer, line-separated.",
                  },
                },
                required: ["raw_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_flyer_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured data", raw: aiData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("extract-flyer-text error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
