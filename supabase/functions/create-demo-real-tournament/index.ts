// Admin-only: creates a REAL tournament (is_demo=true) under a per-admin
// "Demo Sandbox" organization, then seeds 12 mock players. The result is a
// fully functional tournament that the admin can walk through during a
// screen-share demo (Players, Leaderboard, Scoring, Day-of, Sponsors, etc).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOCK_PLAYERS = [
  { first_name: "John", last_name: "Smith", handicap: 12, shirt_size: "Large" },
  { first_name: "Sarah", last_name: "Jones", handicap: 8, shirt_size: "Medium" },
  { first_name: "Michael", last_name: "Brown", handicap: 18, shirt_size: "XL" },
  { first_name: "Emily", last_name: "Davis", handicap: 14, shirt_size: "Small" },
  { first_name: "David", last_name: "Wilson", handicap: 5, shirt_size: "Large" },
  { first_name: "Lisa", last_name: "Taylor", handicap: 10, shirt_size: "Medium" },
  { first_name: "Robert", last_name: "Anderson", handicap: 16, shirt_size: "XL" },
  { first_name: "Jennifer", last_name: "Martinez", handicap: 9, shirt_size: "Small" },
  { first_name: "Thomas", last_name: "Garcia", handicap: 11, shirt_size: "Large" },
  { first_name: "Patricia", last_name: "Rodriguez", handicap: 7, shirt_size: "Medium" },
  { first_name: "Charles", last_name: "Miller", handicap: 19, shirt_size: "XL" },
  { first_name: "Barbara", last_name: "Williams", handicap: 13, shirt_size: "Medium" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const {
      tournament_name,
      event_date,
      location,
      course_name,
      registration_fee_cents = 0,
      scoring_format = "stroke_play",
      hero_image_url = null,
    } = body || {};

    if (!tournament_name) {
      return new Response(JSON.stringify({ error: "tournament_name required" }), { status: 400, headers: corsHeaders });
    }

    // Find or create the admin's shared "Demo Sandbox" organization.
    const { data: memberships } = await admin
      .from("org_members")
      .select("organization_id, organizations!inner(id, name)")
      .eq("user_id", user.id);
    let orgId: string | null = null;
    for (const m of (memberships || []) as any[]) {
      if (m.organizations?.name === "Demo Sandbox") {
        orgId = m.organization_id;
        break;
      }
    }
    if (!orgId) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({ name: "Demo Sandbox", plan: "pro" })
        .select()
        .single();
      if (orgErr) throw orgErr;
      orgId = org.id;
      await admin.from("org_members").insert({
        organization_id: orgId,
        user_id: user.id,
        role: "owner",
        permissions: [],
      });
    }

    // Create the REAL tournament. is_demo=true so it's flagged for cleanup
    // and excluded from public search; is_pro=true so all premium tabs unlock.
    const { data: tournament, error: tErr } = await admin
      .from("tournaments")
      .insert({
        organization_id: orgId,
        title: tournament_name,
        date: event_date || null,
        location: location || null,
        course_name: course_name || null,
        registration_fee_cents,
        scoring_format,
        site_hero_image_url: hero_image_url,
        site_published: true,
        registration_open: true,
        status: "published",
        is_demo: true,
        is_pro: true,
        show_in_public_search: false,
        max_group_size: 4,
        max_players: 144,
      })
      .select()
      .single();
    if (tErr) throw tErr;

    // Seed 12 mock paid registrations grouped into foursomes.
    const regs = MOCK_PLAYERS.map((p, i) => ({
      tournament_id: tournament.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: `${p.first_name}.${p.last_name}.demo@example.com`.toLowerCase(),
      handicap: p.handicap,
      shirt_size: p.shirt_size,
      payment_status: "paid",
      group_number: Math.floor(i / 4) + 1,
      group_position: (i % 4) + 1,
    }));
    const { error: rErr } = await admin.from("tournament_registrations").insert(regs);
    if (rErr) throw rErr;

    // Seed sponsorship packages + sponsors so the demo shows how sponsorship
    // is promoted on the public event page and dashboard.
    await admin.from("sponsorship_tiers").insert([
      { tournament_id: tournament.id, name: "Title Sponsor", price_cents: 500000, total_spots: 1, benefits: "Event naming rights • Logo on all signage • 2 foursomes • Podium recognition", is_active: true, published_to_public: true, display_order: 1 },
      { tournament_id: tournament.id, name: "Gold Sponsor", price_cents: 250000, total_spots: 3, benefits: "Logo on leaderboard • 1 foursome • Social media feature", is_active: true, published_to_public: true, display_order: 2 },
      { tournament_id: tournament.id, name: "Silver Sponsor", price_cents: 100000, total_spots: 6, benefits: "Logo on event page • Tee sign • Program listing", is_active: true, published_to_public: true, display_order: 3 },
      { tournament_id: tournament.id, name: "Hole Sponsor", price_cents: 25000, total_spots: 18, benefits: "Branded sign on your sponsored hole", is_active: true, published_to_public: true, display_order: 4 },
    ]);
    await admin.from("tournament_sponsors").insert([
      { tournament_id: tournament.id, name: "Fairway Financial Group", tier: "Title Sponsor", amount: 5000, is_paid: true, show_on_leaderboard: true, show_on_scoring_page: true, display_order: 1 },
      { tournament_id: tournament.id, name: "Birdie Auto Group", tier: "Gold Sponsor", amount: 2500, is_paid: true, show_on_leaderboard: true, show_on_scoring_page: true, display_order: 2 },
      { tournament_id: tournament.id, name: "Clubhouse Coffee Co.", tier: "Silver Sponsor", amount: 1000, is_paid: true, show_on_leaderboard: true, show_on_scoring_page: true, display_order: 3 },
      { tournament_id: tournament.id, name: "Green Ridge Landscaping", tier: "Hole Sponsor", amount: 250, is_paid: true, show_on_leaderboard: true, show_on_scoring_page: true, display_order: 4 },
    ]);

    return new Response(
      JSON.stringify({ tournament, organization_id: orgId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
