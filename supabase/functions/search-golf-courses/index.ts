// Search Golf Courses — combines the shared course_database library with
// OpenGolfAPI results. Public function (no JWT required) so any signed-in
// organizer can search; OpenGolfAPI key is optional.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") || "").trim();
    const state = (url.searchParams.get("state") || "").trim();

    if (!query && !state) {
      return new Response(JSON.stringify({ error: "Missing search query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Saved library results
    let saved: any[] = [];
    let sQ = admin.from("course_database").select("*").limit(10);
    if (query) sQ = sQ.ilike("course_name", `%${query}%`);
    if (state) sQ = sQ.ilike("state", state);
    const { data: savedData } = await sQ;
    saved = savedData || [];

    // OpenGolfAPI results (optional)
    let apiCourses: any[] = [];
    const apiKey = Deno.env.get("OPENGOLFAPI_KEY");
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (query) params.set("query", query);
      if (state) params.set("state", state);
      const res = await fetch(
        `https://api.opengolfapi.org/v1/courses/search?${params.toString()}`,
        { headers: apiKey ? { "X-API-Key": apiKey } : {} },
      );
      if (res.ok) {
        const data = await res.json();
        apiCourses = data.courses || [];
      }
    } catch (err) {
      console.error("OpenGolfAPI error:", err);
    }

    const apiFormatted = apiCourses.map((c: any) => ({
      id: c.id,
      course_name: c.name,
      city: c.city,
      state: c.state,
      tee_name: c.tees?.[0]?.name || "Blue",
      par_total: Array.isArray(c.pars) ? c.pars.reduce((a: number, b: number) => a + b, 0) : null,
      hole_pars: c.pars || null,
      hole_distances: c.yardages || null,
      hole_stroke_indexes: c.handicaps || null,
      slope_rating: c.tees?.[0]?.slope ?? null,
      course_rating: c.tees?.[0]?.rating ?? null,
      source: "api" as const,
    }));

    const courses = [
      ...saved.map((c) => ({ ...c, source: "saved" as const })),
      ...apiFormatted,
    ];

    return new Response(JSON.stringify({ courses }), {
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
