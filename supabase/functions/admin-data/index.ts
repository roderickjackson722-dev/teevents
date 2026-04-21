import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const jsonRes = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Handle mutations
    if (req.method === "POST") {
      const body = await req.json();

      // --- Prospect Actions ---
      if (action === "add-prospect") {
        const { error } = await adminClient.from("prospects").insert({
          organization_id: null,
          tournament_name: body.tournament_name || "",
          organizer_name: body.organizer_name || "",
          contact_name: body.contact_name || "",
          contact_email: body.contact_email || "",
          contact_phone: body.contact_phone || "",
          location: body.location || "",
          event_date: body.event_date || "",
          source: body.source || "eventbrite",
          source_url: body.source_url || "",
          status: body.status || "new",
          notes: body.notes || "",
          next_follow_up: body.next_follow_up || null,
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-prospect") {
        const updates: Record<string, unknown> = {};
        for (const key of ["tournament_name", "organizer_name", "contact_name", "contact_email", "contact_phone", "location", "event_date", "source", "source_url", "status", "notes", "next_follow_up", "email_response_status", "follow_up_count"]) {
          if (body[key] !== undefined) updates[key] = body[key];
        }
        if (body.status === "contacted") updates.last_contacted_at = new Date().toISOString();
        const { error } = await adminClient.from("prospects").update(updates).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-prospect") {
        const { error } = await adminClient.from("prospects").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "add-prospect-activity") {
        const { error } = await adminClient.from("prospect_activities").insert({
          prospect_id: body.prospect_id,
          type: body.type || "note",
          description: body.description || "",
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-prospect-activity") {
        const { error } = await adminClient.from("prospect_activities").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "log-email-sent") {
        // Update prospect with template info
        const updates: Record<string, unknown> = {
          last_email_template: body.template_slug,
          last_email_sent_at: new Date().toISOString(),
          email_response_status: "sent",
          status: body.new_status || undefined,
        };
        if (body.new_status === "contacted") updates.last_contacted_at = new Date().toISOString();
        await adminClient.from("prospects").update(updates).eq("id", body.prospect_id);
        // Log activity
        await adminClient.from("prospect_activities").insert({
          prospect_id: body.prospect_id,
          type: "email",
          description: `Outreach email sent: "${body.template_name}"`,
        });
        return jsonRes({ success: true });
      }

      if (action === "save-outreach-template") {
        if (body.id) {
          const { error } = await adminClient.from("outreach_templates").update({
            name: body.name, subject: body.subject, body: body.body, category: body.category,
          }).eq("id", body.id);
          if (error) return jsonRes({ error: error.message }, 400);
        } else {
          const slug = (body.name || "custom").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 50) + "_" + Date.now();
          const { error } = await adminClient.from("outreach_templates").insert({
            slug, name: body.name, subject: body.subject, body: body.body, category: body.category || "custom", sort_order: 99,
          });
          if (error) return jsonRes({ error: error.message }, 400);
        }
        return jsonRes({ success: true });
      }

      if (action === "delete-outreach-template") {
        const { error } = await adminClient.from("outreach_templates").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      // --- Promo Code Actions ---
      if (action === "add-promo-code") {
        const { error } = await adminClient.from("promo_codes").insert({
          code: (body.code || "").trim().toUpperCase(),
          discount_type: body.discount_type || "percent",
          discount_value: body.discount_value || 0,
          max_uses: body.max_uses || null,
          is_active: body.is_active !== false,
          expires_at: body.expires_at || null,
          applicable_plans: body.applicable_plans || ["starter", "pro"],
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-promo-code") {
        const { error } = await adminClient.from("promo_codes").update({
          code: (body.code || "").trim().toUpperCase(),
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          max_uses: body.max_uses || null,
          is_active: body.is_active,
          expires_at: body.expires_at || null,
          applicable_plans: body.applicable_plans,
        }).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-promo-code") {
        const { error } = await adminClient.from("promo_codes").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-promo-code") {
        const { error } = await adminClient.from("promo_codes").update({ is_active: body.is_active }).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      // --- Demo Event Actions ---
      if (action === "create-demo-event") {
        const orgId = crypto.randomUUID();
        const { error: orgError } = await adminClient.from("organizations").insert({
          id: orgId,
          name: body.label || "Demo Organization",
        });
        if (orgError) return jsonRes({ error: orgError.message }, 400);

        // Add admin as org member
        const { error: memberError } = await adminClient.from("org_members").insert({
          organization_id: orgId,
          user_id: user.id,
          role: "owner",
        });
        if (memberError) return jsonRes({ error: memberError.message }, 400);

        const { data: tournament, error: tournError } = await adminClient.from("tournaments").insert({
          organization_id: orgId,
          title: body.tournament_title || "Demo Tournament",
          date: body.date || null,
          location: body.location || null,
          course_name: body.course_name || null,
          site_published: true,
          registration_open: true,
        }).select("id").single();
        if (tournError) return jsonRes({ error: tournError.message }, 400);

        const { error: demoError } = await adminClient.from("admin_demo_events").insert({
          organization_id: orgId,
          tournament_id: tournament.id,
          label: body.label || "Demo Event",
        });
        if (demoError) return jsonRes({ error: demoError.message }, 400);

        return jsonRes({ success: true, organization_id: orgId, tournament_id: tournament.id });
      }

      if (action === "update-org-plan") {
        if (!body.organization_id || !body.plan) {
          return jsonRes({ error: "Missing organization_id or plan" }, 400);
        }
        const validPlans = ["free", "starter", "premium"];
        if (!validPlans.includes(body.plan)) {
          return jsonRes({ error: "Invalid plan" }, 400);
        }
        const { error } = await adminClient
          .from("organizations")
          .update({ plan: body.plan })
          .eq("id", body.organization_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-org-feature-overrides") {
        if (!body.organization_id) {
          return jsonRes({ error: "Missing organization_id" }, 400);
        }
        const { error } = await adminClient
          .from("organizations")
          .update({ feature_overrides: body.feature_overrides || null })
          .eq("id", body.organization_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-org-fee-override") {
        if (!body.organization_id) {
          return jsonRes({ error: "Missing organization_id" }, 400);
        }
        const { error } = await adminClient
          .from("organizations")
          .update({ fee_override: body.fee_override ?? null })
          .eq("id", body.organization_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      // --- Platform Store Actions ---
      if (action === "add-platform-product") {
        const { error } = await adminClient.from("platform_store_products").insert({
          name: body.name,
          description: body.description || null,
          price: body.price || 0,
          image_url: body.image_url || null,
          category: body.category || "merchandise",
          sort_order: body.sort_order ?? 0,
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-platform-product") {
        const updates: Record<string, unknown> = {};
        for (const key of ["name", "description", "price", "image_url", "category", "sort_order"]) {
          if (body[key] !== undefined) updates[key] = body[key];
        }
        const { error } = await adminClient.from("platform_store_products").update(updates).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-platform-product") {
        const { error } = await adminClient.from("platform_store_products").update({ is_active: body.is_active }).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-platform-product") {
        const { error } = await adminClient.from("platform_store_products").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-tournament-published") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const { error } = await adminClient
          .from("tournaments")
          .update({ site_published: body.site_published })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-tournament-registration") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const { error } = await adminClient
          .from("tournaments")
          .update({ registration_open: body.registration_open })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-pass-fees") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const { error } = await adminClient
          .from("tournaments")
          .update({ pass_fees_to_registrants: body.pass_fees_to_registrants })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-managed-by-teevents") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const { error } = await adminClient
          .from("tournaments")
          .update({ managed_by_teevents: body.managed_by_teevents })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "toggle-public-search") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const { error } = await adminClient
          .from("tournaments")
          .update({ show_in_public_search: body.show_in_public_search })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "set-payment-override") {
        if (!body.tournament_id) return jsonRes({ error: "Missing tournament_id" }, 400);
        const allowed = ["default", "force_stripe", "force_platform"];
        if (!allowed.includes(body.payment_method_override)) {
          return jsonRes({ error: "Invalid payment_method_override" }, 400);
        }
        const { error } = await adminClient
          .from("tournaments")
          .update({ payment_method_override: body.payment_method_override })
          .eq("id", body.tournament_id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-demo-event") {
        // Get the demo event to find org & tournament
        const { data: demo } = await adminClient.from("admin_demo_events").select("*").eq("id", body.id).single();
        if (demo) {
          await adminClient.from("admin_demo_events").delete().eq("id", body.id);
          await adminClient.from("tournaments").delete().eq("id", demo.tournament_id);
          await adminClient.from("org_members").delete().eq("organization_id", demo.organization_id);
          await adminClient.from("organizations").delete().eq("id", demo.organization_id);
        }
        return jsonRes({ success: true });
      }

      // --- Existing Actions ---
      if (action === "add-resource") {
        const { error } = await adminClient.from("event_resources").insert({
          event_id: body.event_id,
          title: body.title,
          description: body.description || null,
          link: body.link || null,
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-resource-link") {
        const { error } = await adminClient.from("event_resources").update({ link: body.link || null }).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-resource") {
        const { error } = await adminClient.from("event_resources").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "reorder-resources") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("event_resources").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return jsonRes({ success: true });
      }

      if (action === "add-review") {
        const { error } = await adminClient.from("reviews").insert({
          author: body.author,
          organization: body.organization || "",
          text: body.text,
          sort_order: body.sort_order ?? 0,
        });
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "update-review") {
        const { error } = await adminClient.from("reviews").update({
          author: body.author,
          organization: body.organization || "",
          text: body.text,
        }).eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-review") {
        const { error } = await adminClient.from("reviews").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "reorder-reviews") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("reviews").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return jsonRes({ success: true });
      }

      if (action === "reorder-events") {
        const updates: { id: string; sort_order: number }[] = body.updates || [];
        for (const u of updates) {
          await adminClient.from("events").update({ sort_order: u.sort_order }).eq("id", u.id);
        }
        return jsonRes({ success: true });
      }

      if (action === "grant-access") {
        const email = (body.email || "").trim().toLowerCase();
        if (!body.event_id || !email || !body.name) {
          return jsonRes({ error: "Missing fields" }, 400);
        }
        const { data: existing } = await adminClient
          .from("event_access_requests")
          .select("id, status")
          .eq("event_id", body.event_id)
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          if (existing.status === "approved") {
            return jsonRes({ error: "Already approved" }, 400);
          }
          const { error } = await adminClient.from("event_access_requests").update({ status: "approved" }).eq("id", existing.id);
          if (error) return jsonRes({ error: error.message }, 400);
        } else {
          const { error } = await adminClient.from("event_access_requests").insert({
            event_id: body.event_id,
            email,
            name: body.name.trim(),
            status: "approved",
          });
          if (error) return jsonRes({ error: error.message }, 400);
        }
        return jsonRes({ success: true });
      }

      if (action === "add-approved-email") {
        const email = (body.email || "").trim().toLowerCase();
        if (!body.event_id || !email) {
          return jsonRes({ error: "Missing fields" }, 400);
        }
        const { error } = await adminClient.from("approved_emails").insert({ event_id: body.event_id, email });
        if (error) return jsonRes({ error: error.code === "23505" ? "Email already added" : error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-approved-email") {
        const { error } = await adminClient.from("approved_emails").delete().eq("id", body.id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "bulk-add-approved-emails") {
        const emails: string[] = body.emails || [];
        const eventId = body.event_id;
        if (!eventId || !emails.length) {
          return jsonRes({ error: "Missing event or emails" }, 400);
        }
        let added = 0;
        let skipped = 0;
        for (const raw of emails) {
          const email = (raw || "").trim().toLowerCase();
          if (!email) { skipped++; continue; }
          const { error } = await adminClient.from("approved_emails").insert({ event_id: eventId, email });
          if (error) { skipped++; } else { added++; }
        }
        return jsonRes({ success: true, added, skipped });
      }

      if (action === "bulk-grant-access") {
        const entries: { name: string; email: string }[] = body.entries || [];
        const eventId = body.event_id;
        if (!eventId || !entries.length) {
          return jsonRes({ error: "Missing event or entries" }, 400);
        }
        let granted = 0;
        let skipped = 0;
        for (const entry of entries) {
          const email = (entry.email || "").trim().toLowerCase();
          const name = (entry.name || "").trim();
          if (!email || !name) { skipped++; continue; }
          const { data: existing } = await adminClient
            .from("event_access_requests")
            .select("id, status")
            .eq("event_id", eventId)
            .eq("email", email)
            .maybeSingle();
          if (existing && existing.status === "approved") { skipped++; continue; }
          if (existing) {
            await adminClient.from("event_access_requests").update({ status: "approved" }).eq("id", existing.id);
          } else {
            await adminClient.from("event_access_requests").insert({
              event_id: eventId, email, name, status: "approved",
            });
          }
          granted++;
        }
        return jsonRes({ success: true, granted, skipped });
      }

      if (action === "update-outreach-template") {
        const { id, subject, body: templateBody } = await req.json();
        const { error } = await adminClient.from("outreach_templates").update({ subject, body: templateBody }).eq("id", id);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }

      if (action === "delete-tournament") {
        const tournamentId = body.tournament_id;
        if (!tournamentId) return jsonRes({ error: "tournament_id required" }, 400);

        // Delete related data first (order matters for FK constraints)
        await adminClient.from("tournament_survey_responses").delete().eq("survey_id", tournamentId);
        const { data: surveys } = await adminClient.from("tournament_surveys").select("id").eq("tournament_id", tournamentId);
        if (surveys) {
          for (const s of surveys) {
            await adminClient.from("tournament_survey_responses").delete().eq("survey_id", s.id);
            await adminClient.from("tournament_survey_questions").delete().eq("survey_id", s.id);
          }
          await adminClient.from("tournament_surveys").delete().eq("tournament_id", tournamentId);
        }
        await adminClient.from("tournament_photos").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_checklist_items").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_budget_items").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_messages").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_waitlist").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_promo_codes").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_registration_addons").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_registration_fields").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_registration_tiers").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_donations").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_volunteers").delete().eq("tournament_id", tournamentId);

        // Auction bids reference items, so delete bids first
        const { data: auctionItems } = await adminClient.from("tournament_auction_items").select("id").eq("tournament_id", tournamentId);
        if (auctionItems) {
          for (const item of auctionItems) {
            await adminClient.from("tournament_auction_bids").delete().eq("item_id", item.id);
          }
        }
        await adminClient.from("tournament_auction_items").delete().eq("tournament_id", tournamentId);

        // Sponsor assets reference sponsors
        const { data: sponsors } = await adminClient.from("tournament_sponsors").select("id").eq("tournament_id", tournamentId);
        if (sponsors) {
          for (const sp of sponsors) {
            await adminClient.from("sponsor_assets").delete().eq("sponsor_id", sp.id);
          }
        }
        await adminClient.from("tournament_sponsors").delete().eq("tournament_id", tournamentId);

        // Refund requests reference registrations
        await adminClient.from("tournament_refund_requests").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_scores").delete().eq("tournament_id", tournamentId);
        await adminClient.from("tournament_registrations").delete().eq("tournament_id", tournamentId);

        // Platform transactions
        await adminClient.from("platform_transactions").delete().eq("tournament_id", tournamentId);

        // Demo events
        await adminClient.from("admin_demo_events").delete().eq("tournament_id", tournamentId);

        // Finally delete the tournament
        const { error } = await adminClient.from("tournaments").delete().eq("id", tournamentId);
        if (error) return jsonRes({ error: error.message }, 400);
        return jsonRes({ success: true });
      }
    }

    // Default: fetch all admin data
    const [eventsRes, requestsRes, emailsRes, resourcesRes, reviewsRes, promoCodesRes, demoEventsRes, orgsRes, prospectsRes, activitiesRes, templatesRes, allTournamentsRes, platformProductsRes] = await Promise.all([
      adminClient.from("events").select("*").order("sort_order", { ascending: true }),
      adminClient.from("event_access_requests").select("*").order("created_at", { ascending: false }),
      adminClient.from("approved_emails").select("*").order("created_at", { ascending: false }),
      adminClient.from("event_resources").select("*").order("sort_order", { ascending: true }),
      adminClient.from("reviews").select("*").order("sort_order", { ascending: true }),
      adminClient.from("promo_codes").select("*").order("created_at", { ascending: false }),
      adminClient.from("admin_demo_events").select("*, tournaments(id, title, slug, site_published)").order("created_at", { ascending: false }),
      adminClient.from("organizations").select("*, tournaments(id, title)").order("created_at", { ascending: false }),
      adminClient.from("prospects").select("*").is("organization_id", null).order("created_at", { ascending: false }),
      adminClient.from("prospect_activities").select("*").order("created_at", { ascending: false }),
      adminClient.from("outreach_templates").select("*").order("sort_order", { ascending: true }),
      adminClient.from("tournaments").select("*, organizations(id, name, plan, stripe_account_id, is_nonprofit, ein, nonprofit_verified, feature_overrides, fee_override), tournament_registrations(id)").order("created_at", { ascending: false }),
      adminClient.from("platform_store_products").select("*").order("sort_order", { ascending: true }),
    ]);

    return new Response(
      JSON.stringify({
        events: eventsRes.data || [],
        requests: requestsRes.data || [],
        approvedEmails: emailsRes.data || [],
        resources: resourcesRes.data || [],
        reviews: reviewsRes.data || [],
        promoCodes: promoCodesRes.data || [],
        demoEvents: demoEventsRes.data || [],
        organizations: orgsRes.data || [],
        prospects: prospectsRes.data || [],
        prospectActivities: activitiesRes.data || [],
        outreachTemplates: templatesRes.data || [],
        allTournaments: allTournamentsRes.data || [],
        platformProducts: platformProductsRes.data || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
