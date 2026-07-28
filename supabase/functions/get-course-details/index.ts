// Get Course Details — fetches either a saved library course or an
// OpenGolfAPI course by id and returns it in our schema shape.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

// Pull a yardage for a hole matching the requested tee, else the longest available.
function yardageForTee(h: any, teeColor: string | null): number | null {
  const y = h?.yardages;
  if (typeof y === "number") return num(y);
  if (!y || typeof y !== "object") return null;
  if (teeColor && num(y[teeColor]) != null) return num(y[teeColor]);
  if (num(y.detected) != null) return num(y.detected);
  const vals = Object.values(y).map(num).filter((v): v is number => v != null);
  return vals.length ? Math.max(...vals) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const source = url.searchParams.get("source") || "api";
    const requestedTee = (url.searchParams.get("tee") || "").trim().toLowerCase();

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
    const headers = apiKey ? { "X-API-Key": apiKey } : {};
    const id = encodeURIComponent(courseId);

    // The /api/v1 detail endpoint carries the full scorecard (per-hole par,
    // handicap index and per-tee yardages) plus the tee/rating/slope table.
    // The legacy /v1 endpoint only has a stub scorecard, so use it as fallback.
    let data: any = null;
    try {
      const rich = await fetch(`https://api.opengolfapi.org/api/v1/courses/${id}`, { headers });
      if (rich.ok) data = await rich.json();
    } catch { /* fall through */ }
    if (!data) {
      const res = await fetch(`https://api.opengolfapi.org/v1/courses/${id}`, { headers });
      if (!res.ok) throw new Error("Course not found in API");
      data = await res.json();
    }

    const buildAddress = (c: any) => {
      const street = c.address || c.street || null;
      const cityStateZip = [c.city, c.state, c.postal_code].filter(Boolean).join(", ");
      if (street && c.city && street.toLowerCase().includes(String(c.city).toLowerCase())) return street;
      return [street, cityStateZip].filter(Boolean).join(", ") || null;
    };

    const tees = Array.isArray(data.tees)
      ? data.tees.map((t: any) => ({
          tee_name: t.tee_name || t.name || null,
          tee_color: (t.tee_color || t.color || t.tee_name || "").toString().toLowerCase() || null,
          gender: t.gender || null,
          course_rating: num(t.course_rating ?? t.rating),
          slope_rating: num(t.slope ?? t.slope_rating),
          par: num(t.par),
          yardage: num(t.yardage),
        }))
      : [];

    const selectedTee =
      tees.find((t: any) => (t.tee_name || "").toLowerCase() === requestedTee) ||
      tees.find((t: any) => (t.gender || "").toLowerCase() === "male") ||
      tees[0] ||
      null;

    // Per-hole rows: /api/v1 uses holes_data, /v1 uses scorecard.
    const rows: any[] = Array.isArray(data.holes_data)
      ? data.holes_data
      : Array.isArray(data.scorecard)
        ? data.scorecard
        : [];
    const sorted = rows
      .slice()
      .sort((a, b) => (a.number ?? a.hole_number ?? a.hole ?? 0) - (b.number ?? b.hole_number ?? b.hole ?? 0));

    const holePars = sorted.map((h) => num(h.par)).filter((p): p is number => p != null);
    const holeSIs = sorted
      .map((h) => num(h.handicap_index ?? h.stroke_index ?? h.handicap))
      .filter((p): p is number => p != null);
    const holeYards = sorted
      .map((h) => yardageForTee(h, selectedTee?.tee_color ?? null))
      .filter((p): p is number => p != null);

    const listedPar = num(data.par_total) ?? num(data.par) ?? selectedTee?.par ?? null;
    const parsSum = holePars.reduce((a, b) => a + b, 0);
    // Only trust the per-hole pars when we have a full 18 and they reconcile
    // with the course's listed par — OpenGolfAPI ships placeholder scorecards
    // for some courses (every hole a par 5) that would corrupt handicaps.
    const parsTrusted = holePars.length === 18 && listedPar != null && parsSum === listedPar;

    const formatted = {
      course_name: data.course_name || data.name || data.club_name || "Unnamed course",
      city: data.city,
      state: data.state,
      address: buildAddress(data),
      website: data.website || null,
      tee_name: selectedTee?.tee_name || "Blue",
      par_total: listedPar,
      hole_pars: holePars.length === 18 ? holePars : null,
      hole_pars_total: holePars.length === 18 ? parsSum : null,
      hole_pars_verified: parsTrusted,
      hole_distances: holeYards.length === 18 ? holeYards : null,
      hole_stroke_indexes: holeSIs.length === 18 ? holeSIs : null,
      slope_rating: selectedTee?.slope_rating ?? null,
      course_rating: selectedTee?.course_rating ?? null,
      tees,
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
