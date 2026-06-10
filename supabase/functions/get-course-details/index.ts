// Get Course Details — fetches either a saved library course or an
// OpenGolfAPI course by id and returns it in our schema shape.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const source = url.searchParams.get("source") || "api";

    if (!courseId) {
      return new Response(JSON.stringify({ error: "Missing courseId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (source === "saved") {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await admin
        .from("course_database")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      // Best-effort bump use_count
      if (data) {
        await admin
          .from("course_database")
          .update({ use_count: (data.use_count ?? 0) + 1 })
          .eq("id", courseId);
      }
      return new Response(JSON.stringify({ course: data ? { ...data, source: "saved" } : null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENGOLFAPI_KEY");
    const res = await fetch(`https://api.opengolfapi.org/v1/courses/${encodeURIComponent(courseId)}`, {
      headers: apiKey ? { "X-API-Key": apiKey } : {},
    });
    if (!res.ok) throw new Error("Course not found in API");
    const data = await res.json();

    const buildAddress = (c: any) => {
      const street = c.address || c.street || null;
      const cityStateZip = [c.city, c.state, c.postal_code].filter(Boolean).join(", ");
      if (street && c.city && street.toLowerCase().includes(String(c.city).toLowerCase())) return street;
      return [street, cityStateZip].filter(Boolean).join(", ") || null;
    };
    const sortedScorecard = Array.isArray(data.scorecard)
      ? data.scorecard.slice().sort((a: any, b: any) => (a.hole_number ?? a.hole ?? 0) - (b.hole_number ?? b.hole ?? 0))
      : [];
    const scorecardPars = sortedScorecard.map((h: any) => h.par).filter((p: any) => typeof p === "number");
    const scorecardIndexes = sortedScorecard
      .map((h: any) => h.handicap_index ?? h.stroke_index ?? h.handicap)
      .filter((p: any) => typeof p === "number");

    const formatted = {
      course_name: data.course_name || data.name || data.club_name || "Unnamed course",
      city: data.city,
      state: data.state,
      address: buildAddress(data),
      website: data.website || null,
      tee_name: data.tees?.[0]?.name || "Blue",
      par_total: data.par_total ?? data.par ?? (Array.isArray(data.pars) ? data.pars.reduce((a: number, b: number) => a + b, 0) : null),
      hole_pars: scorecardPars.length ? scorecardPars : data.pars || null,
      hole_distances: data.yardages || null,
      hole_stroke_indexes: scorecardIndexes.length ? scorecardIndexes : data.handicaps || null,
      slope_rating: data.tees?.[0]?.slope ?? null,
      course_rating: data.tees?.[0]?.rating ?? null,
      source: "api" as const,
    };

    return new Response(JSON.stringify({ course: formatted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
