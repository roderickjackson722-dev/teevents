import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_EMAIL = "demo@teevents.com";
const DEMO_PASSWORD = "demo2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create or get demo user
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      if (userErr) throw userErr;
      userId = newUser.user.id;
    }

    // 2. Create or get demo organization
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("name", "Sample Golf Organization")
      .limit(1)
      .single();

    let orgId: string;
    if (existingOrg) {
      orgId = existingOrg.id;
      // Ensure plan is enterprise
      await supabaseAdmin.from("organizations").update({ plan: "enterprise" }).eq("id", orgId);
    } else {
      const { data: newOrg, error: orgErr } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: "Sample Golf Organization",
          plan: "enterprise",
          is_nonprofit: true,
          nonprofit_verified: true,
          nonprofit_name: "Sample Golf Foundation",
          primary_color: "#1a5c38",
          secondary_color: "#c8a84e",
        })
        .select("id")
        .single();
      if (orgErr) throw orgErr;
      orgId = newOrg.id;
    }

    // 3. Create org membership
    const { data: existingMember } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .limit(1)
      .single();

    if (!existingMember) {
      await supabaseAdmin.from("org_members").insert({
        user_id: userId,
        organization_id: orgId,
        role: "owner",
        permissions: [
          "manage_players", "manage_registration", "manage_budget", "manage_sponsors",
          "manage_messages", "manage_leaderboard", "manage_store", "manage_auction",
          "manage_gallery", "manage_volunteers", "manage_surveys", "manage_donations",
          "manage_check_in", "manage_settings",
        ],
      });
    }

    // 4. Create or get demo tournament
    const { data: existingTournament } = await supabaseAdmin
      .from("tournaments")
      .select("id")
      .eq("organization_id", orgId)
      .eq("slug", "sample-charity-classic")
      .limit(1)
      .single();

    let tournamentId: string;
    if (existingTournament) {
      tournamentId = existingTournament.id;
      return new Response(
        JSON.stringify({ success: true, message: "Demo already set up", tournamentId, orgId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: newTournament, error: tournErr } = await supabaseAdmin
      .from("tournaments")
      .insert({
        organization_id: orgId,
        title: "Charity Classic Golf Tournament",
        slug: "sample-charity-classic",
        description: "Annual charity golf tournament benefiting local youth programs. Join us for a day of golf, fun, and fundraising!",
        location: "Pine Valley Golf Club, 123 Fairway Drive",
        course_name: "Pine Valley Golf Club",
        date: "2026-06-15",
        status: "active",
        registration_open: true,
        site_published: true,
        registration_fee_cents: 15000,
        max_players: 144,
        course_par: 72,
        scoring_format: "scramble",
        template: "classic",
        site_hero_title: "Charity Classic Golf Tournament",
        site_hero_subtitle: "Supporting local youth programs since 2018",
        site_primary_color: "#1a5c38",
        site_secondary_color: "#c8a84e",
        contact_email: "demo@teevents.com",
        contact_phone: "(555) 123-4567",
        schedule_info: "7:00 AM - Registration & Breakfast\n8:00 AM - Shotgun Start\n12:30 PM - Lunch & Awards\n1:30 PM - Silent Auction Closes\n2:00 PM - Awards Ceremony",
        donation_goal_cents: 500000,
        foursome_registration: true,
        leaderboard_sponsor_interval_ms: 5000,
        leaderboard_sponsor_style: "banner",
        countdown_style: "glass",
        hole_pars: { "1": 4, "2": 3, "3": 5, "4": 4, "5": 4, "6": 3, "7": 5, "8": 4, "9": 4, "10": 4, "11": 3, "12": 5, "13": 4, "14": 4, "15": 3, "16": 5, "17": 4, "18": 4 },
      })
      .select("id")
      .single();
    if (tournErr) throw tournErr;
    tournamentId = newTournament.id;

    // 5. Players (12 players across 3 holes, 4 per hole)
    const players = [
      { first_name: "John", last_name: "Mitchell", email: "john.mitchell@example.com", phone: "(555) 100-0001", handicap: 15, shirt_size: "L", group_number: 1, group_position: 1, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:15:00Z" },
      { first_name: "Sarah", last_name: "Johnson", email: "sarah.johnson@example.com", phone: "(555) 100-0002", handicap: 17, shirt_size: "M", group_number: 1, group_position: 2, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:20:00Z" },
      { first_name: "Mike", last_name: "Thompson", email: "mike.thompson@example.com", phone: "(555) 100-0003", handicap: 12, shirt_size: "XL", group_number: 1, group_position: 3, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:10:00Z" },
      { first_name: "David", last_name: "Williams", email: "david.williams@example.com", phone: "(555) 100-0004", handicap: 16, shirt_size: "L", group_number: 1, group_position: 4, payment_status: "paid", checked_in: false },
      { first_name: "Lisa", last_name: "Anderson", email: "lisa.anderson@example.com", phone: "(555) 100-0005", handicap: 13, shirt_size: "S", group_number: 2, group_position: 1, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:25:00Z" },
      { first_name: "Robert", last_name: "Garcia", email: "robert.garcia@example.com", phone: "(555) 100-0006", handicap: 18, shirt_size: "L", group_number: 2, group_position: 2, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:30:00Z" },
      { first_name: "James", last_name: "Wilson", email: "james.wilson@example.com", phone: "(555) 100-0007", handicap: 13, shirt_size: "M", group_number: 2, group_position: 3, payment_status: "comp", checked_in: false },
      { first_name: "Emily", last_name: "Davis", email: "emily.davis@example.com", phone: "(555) 100-0008", handicap: 10, shirt_size: "S", group_number: 2, group_position: 4, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:18:00Z" },
      { first_name: "Chris", last_name: "Brown", email: "chris.brown@example.com", phone: "(555) 100-0009", handicap: 12, shirt_size: "L", group_number: 3, group_position: 1, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:22:00Z" },
      { first_name: "Amanda", last_name: "Martinez", email: "amanda.martinez@example.com", phone: "(555) 100-0010", handicap: 15, shirt_size: "M", group_number: 3, group_position: 2, payment_status: "pending", checked_in: false },
      { first_name: "Kevin", last_name: "O'Brien", email: "kevin.obrien@example.com", phone: "(555) 100-0011", handicap: 20, shirt_size: "XL", group_number: 3, group_position: 3, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:35:00Z" },
      { first_name: "Rachel", last_name: "Kim", email: "rachel.kim@example.com", phone: "(555) 100-0012", handicap: 8, shirt_size: "S", group_number: 3, group_position: 4, payment_status: "paid", checked_in: true, check_in_time: "2026-06-15T07:28:00Z" },
    ];

    const { data: registrations, error: regErr } = await supabaseAdmin
      .from("tournament_registrations")
      .insert(players.map((p) => ({ ...p, tournament_id: tournamentId })))
      .select("id, first_name");
    if (regErr) throw regErr;

    // 6. Scores (first 6 holes for all players)
    const scoreData: any[] = [];
    const baseScores: Record<string, number[]> = {
      "John": [4, 3, 5, 4, 5, 3],
      "Sarah": [5, 3, 6, 4, 4, 4],
      "Mike": [4, 2, 5, 3, 4, 3],
      "David": [5, 4, 5, 5, 4, 3],
      "Lisa": [4, 3, 4, 4, 5, 3],
      "Robert": [5, 4, 6, 5, 5, 4],
      "James": [4, 3, 5, 4, 4, 3],
      "Emily": [3, 3, 5, 4, 4, 2],
      "Chris": [4, 3, 5, 5, 4, 3],
      "Amanda": [5, 4, 6, 4, 5, 4],
      "Kevin": [6, 4, 6, 5, 5, 4],
      "Rachel": [3, 2, 4, 3, 4, 3],
    };
    for (const reg of registrations!) {
      const scores = baseScores[reg.first_name] || [4, 3, 5, 4, 4, 3];
      for (let hole = 1; hole <= scores.length; hole++) {
        scoreData.push({ tournament_id: tournamentId, registration_id: reg.id, hole_number: hole, strokes: scores[hole - 1] });
      }
    }
    await supabaseAdmin.from("tournament_scores").insert(scoreData);

    // 7. Sponsors
    await supabaseAdmin.from("tournament_sponsors").insert([
      { tournament_id: tournamentId, name: "First National Bank", tier: "title", amount: 10000, is_paid: true, show_on_leaderboard: true, website_url: "https://example.com", description: "Title sponsor and proud supporter of local youth athletics.", sort_order: 1 },
      { tournament_id: tournamentId, name: "Summit Financial Group", tier: "gold", amount: 5000, is_paid: true, show_on_leaderboard: true, website_url: "https://example.com", description: "Financial planning for a brighter future.", sort_order: 2 },
      { tournament_id: tournamentId, name: "Coastal Insurance", tier: "silver", amount: 2500, is_paid: true, show_on_leaderboard: true, description: "Protecting what matters most.", sort_order: 3 },
      { tournament_id: tournamentId, name: "Valley Auto Group", tier: "silver", amount: 2500, is_paid: false, show_on_leaderboard: true, description: "Your trusted local dealership.", sort_order: 4 },
      { tournament_id: tournamentId, name: "Greenfield Landscaping", tier: "bronze", amount: 1000, is_paid: true, show_on_leaderboard: false, sort_order: 5 },
      { tournament_id: tournamentId, name: "Sunrise Coffee Co.", tier: "bronze", amount: 500, is_paid: true, show_on_leaderboard: false, sort_order: 6 },
    ]);

    // 8. Budget items
    await supabaseAdmin.from("tournament_budget_items").insert([
      { tournament_id: tournamentId, description: "Player Registration Fees", type: "income", category: "Registration", amount: 18000, is_paid: true, sort_order: 1 },
      { tournament_id: tournamentId, description: "Title Sponsorship", type: "income", category: "Sponsorships", amount: 10000, is_paid: true, sort_order: 2 },
      { tournament_id: tournamentId, description: "Gold & Silver Sponsorships", type: "income", category: "Sponsorships", amount: 10000, is_paid: true, sort_order: 3 },
      { tournament_id: tournamentId, description: "Silent Auction Revenue", type: "income", category: "Auction", amount: 5200, is_paid: false, sort_order: 4 },
      { tournament_id: tournamentId, description: "Merchandise Sales", type: "income", category: "Merchandise", amount: 3400, is_paid: true, sort_order: 5 },
      { tournament_id: tournamentId, description: "Course Rental & Cart Fees", type: "expense", category: "Venue", amount: 8000, is_paid: true, sort_order: 6 },
      { tournament_id: tournamentId, description: "Catering & Beverages", type: "expense", category: "Food & Drink", amount: 4500, is_paid: true, sort_order: 7 },
      { tournament_id: tournamentId, description: "Trophies, Prizes & Gift Bags", type: "expense", category: "Prizes", amount: 3000, is_paid: false, sort_order: 8 },
      { tournament_id: tournamentId, description: "Signage, Banners & Print Materials", type: "expense", category: "Marketing", amount: 1200, is_paid: true, sort_order: 9 },
      { tournament_id: tournamentId, description: "Tournament Platform (TeeVents Pro)", type: "expense", category: "Software", amount: 999, is_paid: true, sort_order: 10 },
      { tournament_id: tournamentId, description: "Event Photography", type: "expense", category: "Media", amount: 800, is_paid: false, sort_order: 11 },
    ]);

    // 9. Messages
    await supabaseAdmin.from("tournament_messages").insert([
      { tournament_id: tournamentId, subject: "Welcome to the Charity Classic!", body: "Thank you for registering for our annual Charity Classic Golf Tournament! We're excited to have you join us on June 15th at Pine Valley Golf Club. More details coming soon.", recipient_count: 12, status: "sent", sent_at: "2026-05-01T10:00:00Z" },
      { tournament_id: tournamentId, subject: "Schedule & Course Details", body: "Here is your official tournament day schedule:\n\n7:00 AM - Registration & Breakfast\n8:00 AM - Shotgun Start\n12:30 PM - Lunch & Awards\n\nPlease arrive by 7:00 AM for check-in. Cart assignments will be posted at the clubhouse.", recipient_count: 12, status: "sent", sent_at: "2026-06-01T14:00:00Z" },
      { tournament_id: tournamentId, subject: "Tournament Day Reminder", body: "Tomorrow is the big day! Don't forget to arrive by 7:00 AM. The weather looks perfect for golf. See you on the course!", recipient_count: 12, status: "scheduled", scheduled_for: "2026-06-14T18:00:00Z" },
    ]);

    // 10. Auction items
    await supabaseAdmin.from("tournament_auction_items").insert([
      { tournament_id: tournamentId, title: "Signed Pro Golf Bag", description: "Authentic golf bag signed by PGA tour professionals. Includes certificate of authenticity.", type: "auction", starting_bid: 100, current_bid: 350, is_active: true, sort_order: 1 },
      { tournament_id: tournamentId, title: "Weekend Golf Getaway", description: "Two-night stay at Pebble Beach Resort with 2 rounds of golf for two. Includes cart and range balls.", type: "auction", starting_bid: 200, current_bid: 625, is_active: true, sort_order: 2 },
      { tournament_id: tournamentId, title: "Pro Shop Gift Card Bundle", description: "Five $100 gift cards to local pro shops. Total value $500.", type: "auction", starting_bid: 150, current_bid: 275, is_active: true, sort_order: 3 },
      { tournament_id: tournamentId, title: "Premium Golf Watch", description: "Garmin Approach S70 GPS golf watch with preloaded courses worldwide.", type: "raffle", raffle_ticket_price: 25, is_active: true, sort_order: 4 },
    ]);

    // 11. Store products
    await supabaseAdmin.from("tournament_store_products").insert([
      { tournament_id: tournamentId, name: "Tournament Polo Shirt", description: "Custom embroidered polo with tournament logo. Available in Navy, White, and Green.", price: 45, category: "apparel", is_active: true, sort_order: 1 },
      { tournament_id: tournamentId, name: "Custom Golf Balls (Dozen)", description: "Titleist Pro V1 golf balls with custom tournament logo imprint.", price: 35, category: "equipment", is_active: true, sort_order: 2 },
      { tournament_id: tournamentId, name: "Tournament Hat", description: "Adjustable cap with embroidered tournament crest. One size fits all.", price: 25, category: "apparel", is_active: true, sort_order: 3 },
      { tournament_id: tournamentId, name: "Commemorative Pin Set", description: "Limited edition collector pin set featuring all 18 holes.", price: 15, category: "merchandise", is_active: true, sort_order: 4 },
    ]);

    // 12. Donations
    await supabaseAdmin.from("tournament_donations").insert([
      { tournament_id: tournamentId, amount_cents: 10000, donor_email: "john.mitchell@example.com", status: "completed" },
      { tournament_id: tournamentId, amount_cents: 25000, donor_email: "sarah.johnson@example.com", status: "completed" },
      { tournament_id: tournamentId, amount_cents: 5000, donor_email: "mike.thompson@example.com", status: "completed" },
      { tournament_id: tournamentId, amount_cents: 15000, donor_email: "anonymous@example.com", status: "completed" },
    ]);

    // 13. Survey + questions
    const { data: survey } = await supabaseAdmin
      .from("tournament_surveys")
      .insert({ tournament_id: tournamentId, title: "Post-Event Feedback", is_active: true })
      .select("id")
      .single();

    if (survey) {
      await supabaseAdmin.from("tournament_survey_questions").insert([
        { survey_id: survey.id, question: "How would you rate your overall experience?", type: "rating", sort_order: 1 },
        { survey_id: survey.id, question: "What was your favorite part of the event?", type: "text", sort_order: 2 },
        { survey_id: survey.id, question: "Would you attend this tournament again next year?", type: "multiple_choice", options: ["Definitely", "Probably", "Maybe", "Unlikely"], sort_order: 3 },
        { survey_id: survey.id, question: "How was the food and beverage service?", type: "rating", sort_order: 4 },
        { survey_id: survey.id, question: "Any suggestions for improvement?", type: "text", sort_order: 5 },
      ]);
    }

    // 14. Volunteer roles + volunteers
    const { data: roles } = await supabaseAdmin
      .from("tournament_volunteer_roles")
      .insert([
        { tournament_id: tournamentId, title: "Registration Desk", description: "Greet players, distribute gift bags, and manage check-in.", time_slot: "7:00 AM - 9:00 AM", max_volunteers: 4, sort_order: 1 },
        { tournament_id: tournamentId, title: "Scoring Station", description: "Collect and verify scorecards. Enter scores into the system.", time_slot: "8:00 AM - 2:00 PM", max_volunteers: 2, sort_order: 2 },
        { tournament_id: tournamentId, title: "Awards Ceremony", description: "Set up awards table, assist with prize distribution.", time_slot: "12:00 PM - 2:00 PM", max_volunteers: 3, sort_order: 3 },
      ])
      .select("id, title");

    if (roles) {
      const regDesk = roles.find((r) => r.title === "Registration Desk");
      const scoring = roles.find((r) => r.title === "Scoring Station");
      const awards = roles.find((r) => r.title === "Awards Ceremony");

      await supabaseAdmin.from("tournament_volunteers").insert([
        { tournament_id: tournamentId, role_id: regDesk!.id, name: "Karen Mitchell", email: "karen.m@example.com", phone: "(555) 200-0001", status: "confirmed" },
        { tournament_id: tournamentId, role_id: regDesk!.id, name: "Tom Parker", email: "tom.p@example.com", phone: "(555) 200-0002", status: "confirmed" },
        { tournament_id: tournamentId, role_id: scoring!.id, name: "Diana Ross", email: "diana.r@example.com", phone: "(555) 200-0003", status: "confirmed" },
        { tournament_id: tournamentId, role_id: awards!.id, name: "Steve Adams", email: "steve.a@example.com", phone: "(555) 200-0004", status: "pending" },
      ]);
    }

    // 15. Registration add-ons
    await supabaseAdmin.from("tournament_registration_addons").insert([
      { tournament_id: tournamentId, name: "Mulligan Package (3 mulligans)", price_cents: 2500, is_active: true, sort_order: 1, description: "Three mulligans to use during the round." },
      { tournament_id: tournamentId, name: "Dinner Ticket (Guest)", price_cents: 5000, is_active: true, sort_order: 2, description: "Additional dinner ticket for a guest at the awards ceremony." },
      { tournament_id: tournamentId, name: "Hole-in-One Insurance", price_cents: 1000, is_active: true, sort_order: 3, description: "Win a $10,000 prize if you hit a hole-in-one on Hole #7." },
    ]);

    // 16. Registration fields
    await supabaseAdmin.from("tournament_registration_fields").insert([
      { tournament_id: tournamentId, label: "Company Name", field_type: "text", is_required: false, is_enabled: true, is_default: false, sort_order: 1 },
      { tournament_id: tournamentId, label: "Preferred Tee Time", field_type: "select", is_required: false, is_enabled: true, is_default: false, options: ["Morning (7-8 AM)", "Mid-Morning (8-9 AM)", "Late Morning (9-10 AM)"], sort_order: 2 },
    ]);

    // 17. Promo codes for this tournament
    await supabaseAdmin.from("tournament_promo_codes").insert([
      { tournament_id: tournamentId, code: "EARLY20", discount_type: "percent", discount_value: 20, is_active: true, max_uses: 50, current_uses: 8 },
      { tournament_id: tournamentId, code: "VIP", discount_type: "fixed", discount_value: 50, is_active: true, max_uses: 10, current_uses: 2 },
    ]);

    // Checklist items are auto-created by the seed_tournament_checklist trigger

    return new Response(
      JSON.stringify({ success: true, message: "Demo environment created successfully", tournamentId, orgId, credentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to set up demo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
