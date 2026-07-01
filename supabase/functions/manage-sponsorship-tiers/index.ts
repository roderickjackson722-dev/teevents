import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotificationEmails, notifyPlatformAdmin, buildNotificationHtml } from "../_shared/notify.ts";

/**
 * When a sponsor registration is marked "paid" outside of the Stripe checkout
 * flow (e.g. organizer manually approves an offline/cash/check sponsor), we
 * must still (a) record a platform_transactions row so it shows up on the
 * organizer Finances dashboard, and (b) fire organizer + admin notification
 * emails — matching the behavior of verify-sponsor-payment for online payments.
 * Idempotent via the metadata->>sponsor_registration_id key.
 */
async function recordManualSponsorPayment(
  supabaseAdmin: ReturnType<typeof createClient>,
  registrationId: string,
) {
  try {
    const { data: reg } = await supabaseAdmin
      .from("sponsor_registrations")
      .select("*, sponsorship_tiers(name)")
      .eq("id", registrationId)
      .maybeSingle() as any;
    if (!reg || reg.payment_status !== "paid") return;

    const { data: tournament } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, organization_id")
      .eq("id", reg.tournament_id)
      .maybeSingle() as any;
    if (!tournament?.organization_id) return;

    const gross = Number(reg.amount_cents || 0);
    const tierName = reg.sponsorship_tiers?.name || "Sponsor";

    // Idempotency: only insert if we haven't logged this registration before.
    const { data: existingTx } = await supabaseAdmin
      .from("platform_transactions")
      .select("id")
      .eq("tournament_id", tournament.id)
      .filter("metadata->>sponsor_registration_id", "eq", registrationId)
      .maybeSingle() as any;

    if (!existingTx && gross > 0) {
      await supabaseAdmin.from("platform_transactions").insert({
        organization_id: tournament.organization_id,
        tournament_id: tournament.id,
        amount_cents: gross,
        platform_fee_cents: 0,
        stripe_fee_cents: 0,
        net_amount_cents: gross,
        type: "sponsorship",
        status: "succeeded",
        description: `Sponsorship (manual/offline) — ${reg.company_name || "Sponsor"}`,
        metadata: {
          sponsor_registration_id: registrationId,
          company_name: reg.company_name,
          tier_name: tierName,
          source: "manual_approval",
          payment_channel: "offline",
        },
      });
    }

    // Organizer notification (respects notification_emails + tournament.contact_email)
    await sendNotificationEmails(
      supabaseAdmin,
      tournament.organization_id,
      "notify_registration",
      `New Sponsor — ${tournament.title || "Tournament"}`,
      buildNotificationHtml("New Sponsor (Manual Add-On)", [
        `🏢 <strong>${reg.company_name || "Sponsor"}</strong> was recorded as a <strong>${tierName}</strong> sponsor.`,
        reg.contact_email ? `📧 ${reg.contact_email}${reg.contact_phone ? ` • 📱 ${reg.contact_phone}` : ""}` : "",
        `💰 Sponsorship amount: <strong>$${(gross / 100).toFixed(2)}</strong>`,
        `<em>This is a <strong>manual add-on</strong>. It did not go through online checkout — <strong>payment must be collected manually</strong> by the organizer (cash, check, or invoice).</em>`,
      ].filter(Boolean) as string[]),
      tournament.id,
    );

    // Platform-admin notification (always goes to info@teevents.golf)
    await notifyPlatformAdmin({
      supabaseAdmin,
      type: "sponsorship",
      subject: `[TeeVents] Manual Sponsorship — ${tournament.title || "Tournament"}`,
      htmlBody: buildNotificationHtml("Manual Sponsorship Recorded", [
        `🏢 <strong>${reg.company_name || "Sponsor"}</strong> — ${tierName}`,
        `🏌️ Tournament: <strong>${tournament.title || "Unknown"}</strong>`,
        `💰 Gross: $${(gross / 100).toFixed(2)}`,
        reg.contact_email ? `📧 ${reg.contact_email}` : "",
        `<em>Source: manual approval (offline)</em>`,
      ].filter(Boolean) as string[]),
      organizationId: tournament.organization_id,
      tournamentId: tournament.id,
    });
  } catch (err) {
    console.error("[recordManualSponsorPayment] failed:", err);
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TierInput = {
  name?: string;
  description?: string | null;
  price_cents?: number;
  benefits?: string | null;
  display_order?: number;
  is_active?: boolean;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const sanitizeTierPayload = (payload: any, tournamentId: string, fallbackOrder = 0) => {
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 100) : "";
  const priceCents = Number(payload.price_cents);
  const displayOrder = Number.isFinite(Number(payload.display_order))
    ? Math.max(0, Math.trunc(Number(payload.display_order)))
    : fallbackOrder;

  if (!name) throw new Error("Tier name is required");
  if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error("Tier price must be greater than $0");

  const totalSpotsRaw = payload.total_spots;
  const totalSpots = totalSpotsRaw === null || totalSpotsRaw === undefined || totalSpotsRaw === ""
    ? null
    : Math.max(0, Math.trunc(Number(totalSpotsRaw)));
  const packageType = typeof payload.package_type === "string" && payload.package_type.trim()
    ? payload.package_type.trim().slice(0, 50)
    : null;
  const customPackageLabel = typeof payload.custom_package_label === "string"
    ? (payload.custom_package_label.trim().slice(0, 60) || null)
    : null;

  return {
    tournament_id: tournamentId,
    name,
    description: normalizeOptionalText(payload.description, 200),
    price_cents: Math.trunc(priceCents),
    benefits: normalizeOptionalText(payload.benefits, 4000),
    display_order: displayOrder,
    is_active: payload.is_active ?? true,
    total_spots: Number.isFinite(totalSpots as number) ? totalSpots : null,
    package_type: packageType,
    custom_package_label: customPackageLabel,
    hide_price_when_sold_out: payload.hide_price_when_sold_out !== false,
    show_remaining: payload.show_remaining === true,
    require_logo: payload.require_logo === true,
    show_logo_upload: payload.show_logo_upload !== false,
    allow_additional_notes: payload.allow_additional_notes === true,
  };
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1]?.trim();
  if (!token) throw new Error("Unauthorized");

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");

  return data.user;
};

const resolveTournamentId = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  tournamentId?: string,
  tierId?: string,
) => {
  if (tournamentId) return tournamentId;
  if (!tierId) throw new Error("Tournament not specified");

  const { data: tier, error } = await supabaseAdmin
    .from("sponsorship_tiers")
    .select("tournament_id")
    .eq("id", tierId)
    .maybeSingle();

  if (error || !tier?.tournament_id) throw new Error("Sponsorship tier not found");
  return tier.tournament_id as string;
};

const verifyAccess = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  tournamentId: string,
) => {
  const [{ data: tournament, error: tournamentError }, { data: isAdmin }] = await Promise.all([
    supabaseAdmin.from("tournaments").select("organization_id").eq("id", tournamentId).maybeSingle(),
    supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);

  if (tournamentError || !tournament?.organization_id) throw new Error("Tournament not found");
  if (isAdmin) return tournament.organization_id as string;

  const { data: membership } = await supabaseAdmin
    .from("org_members")
    .select("id")
    .eq("organization_id", tournament.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) throw new Error("You do not have permission to manage sponsorship tiers for this tournament");

  return tournament.organization_id as string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const action = body?.action as string | undefined;
    const tierId = body?.tier_id as string | undefined;
    const rawTournamentId = body?.tournament_id as string | undefined;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const registrationId = body?.registration_id as string | undefined;

    let resolvedTournamentId = rawTournamentId;
    if (!resolvedTournamentId && registrationId) {
      const { data: reg } = await supabaseAdmin
        .from("sponsor_registrations")
        .select("tournament_id")
        .eq("id", registrationId)
        .maybeSingle();
      if (!reg?.tournament_id) throw new Error("Sponsor registration not found");
      resolvedTournamentId = reg.tournament_id as string;
    }

    const tournamentId = await resolveTournamentId(supabaseAdmin, resolvedTournamentId, tierId);
    await verifyAccess(supabaseAdmin, user.id, tournamentId);

    if (action === "create_registration" || action === "update_registration") {
      const p = body?.payload ?? {};
      const companyName = typeof p.company_name === "string" ? p.company_name.trim().slice(0, 200) : "";
      if (!companyName) throw new Error("Company name is required");
      const amountCents = Number.isFinite(Number(p.amount_cents)) ? Math.max(0, Math.trunc(Number(p.amount_cents))) : 0;
      const tierIdValue = typeof p.tier_id === "string" && p.tier_id ? p.tier_id : null;
      const status = typeof p.payment_status === "string" ? p.payment_status.toLowerCase() : "pending";
      const allowed = ["pending", "paid", "refunded", "cancelled", "failed"];
      if (!allowed.includes(status)) throw new Error("Invalid status");

      const record: Record<string, unknown> = {
        tournament_id: tournamentId,
        tier_id: tierIdValue,
        company_name: companyName,
        contact_name: normalizeOptionalText(p.contact_name, 200) ?? "",
        contact_email: normalizeOptionalText(p.contact_email, 320) ?? "",
        contact_phone: normalizeOptionalText(p.contact_phone, 50),
        website_url: normalizeOptionalText(p.website_url, 500),
        description: normalizeOptionalText(p.description, 2000),
        logo_url: normalizeOptionalText(p.logo_url, 1000),
        amount_cents: amountCents,
        payment_status: status,
        paid_at: status === "paid" ? new Date().toISOString() : null,
        show_on_public: p.show_on_public !== false,
        manually_approved: p.manually_approved === true,
        is_title_sponsor: p.is_title_sponsor === true,
      };

      // Enforce only one title sponsor per tournament
      if (record.is_title_sponsor === true) {
        const clear = supabaseAdmin
          .from("sponsor_registrations")
          .update({ is_title_sponsor: false })
          .eq("tournament_id", tournamentId);
        if (action !== "create_registration" && registrationId) {
          await clear.neq("id", registrationId);
        } else {
          await clear;
        }
      }

      if (action === "create_registration") {
        const { data, error } = await supabaseAdmin
          .from("sponsor_registrations")
          .insert(record)
          .select("id")
          .single();
        if (error) throw error;
        if (status === "paid") {
          await recordManualSponsorPayment(supabaseAdmin, data.id);
        }
        return json({ success: true, id: data.id });
      } else {
        if (!registrationId) throw new Error("Registration not specified");
        // Don't overwrite paid_at on update unless newly transitioning to paid
        const { data: existing } = await supabaseAdmin
          .from("sponsor_registrations")
          .select("payment_status, paid_at")
          .eq("id", registrationId)
          .maybeSingle();
        if (existing?.payment_status === "paid" && status === "paid") {
          record.paid_at = existing.paid_at;
        }
        const { error } = await supabaseAdmin
          .from("sponsor_registrations")
          .update(record)
          .eq("id", registrationId)
          .eq("tournament_id", tournamentId);
        if (error) throw error;
        // Fire side effects only when transitioning INTO paid.
        if (status === "paid" && existing?.payment_status !== "paid") {
          await recordManualSponsorPayment(supabaseAdmin, registrationId);
        }
        return json({ success: true });
      }
    }

    if (action === "update_registration_status") {
      if (!registrationId) throw new Error("Registration not specified");
      const status = String(body?.status || "").toLowerCase();
      const allowed = ["pending", "paid", "refunded", "cancelled", "failed"];
      if (!allowed.includes(status)) throw new Error("Invalid status");
      const { data: existing } = await supabaseAdmin
        .from("sponsor_registrations")
        .select("payment_status")
        .eq("id", registrationId)
        .maybeSingle() as any;
      const update: Record<string, unknown> = { payment_status: status };
      if (status === "paid") update.paid_at = new Date().toISOString();
      const { error } = await supabaseAdmin
        .from("sponsor_registrations")
        .update(update)
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      if (status === "paid" && existing?.payment_status !== "paid") {
        await recordManualSponsorPayment(supabaseAdmin, registrationId);
      }
      return json({ success: true });
    }



    if (action === "update_registration_visibility") {
      if (!registrationId) throw new Error("Registration not specified");
      const update: Record<string, unknown> = {};
      if (typeof body?.show_on_public === "boolean") update.show_on_public = body.show_on_public;
      if (typeof body?.manually_approved === "boolean") update.manually_approved = body.manually_approved;
      if (typeof body?.is_title_sponsor === "boolean") update.is_title_sponsor = body.is_title_sponsor;
      if (Object.keys(update).length === 0) throw new Error("Nothing to update");
      // Enforce single title sponsor per tournament
      if (update.is_title_sponsor === true) {
        await supabaseAdmin
          .from("sponsor_registrations")
          .update({ is_title_sponsor: false })
          .eq("tournament_id", tournamentId)
          .neq("id", registrationId);
      }
      const { error } = await supabaseAdmin
        .from("sponsor_registrations")
        .update(update)
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete_registration") {
      if (!registrationId) throw new Error("Registration not specified");
      const { error } = await supabaseAdmin
        .from("sponsor_registrations")
        .delete()
        .eq("id", registrationId)
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "create") {
      const payload = sanitizeTierPayload(body?.payload ?? {}, tournamentId);
      const { data, error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      return json({ success: true, id: data.id });
    }

    if (action === "update") {
      if (!tierId) throw new Error("Tier not specified");
      const payload = sanitizeTierPayload(body?.payload ?? {}, tournamentId);
      const { error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .update(payload)
        .eq("id", tierId);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete") {
      if (!tierId) throw new Error("Tier not specified");
      const { error } = await supabaseAdmin
        .from("sponsorship_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "apply_template") {
      const tiers = Array.isArray(body?.tiers) ? (body.tiers as TierInput[]) : [];
      if (tiers.length === 0) throw new Error("No sponsorship tiers were provided");

      const inserts = tiers.map((tier, index) => sanitizeTierPayload(tier, tournamentId, index + 1));
      const { error } = await supabaseAdmin.from("sponsorship_tiers").insert(inserts);
      if (error) throw error;

      return json({ success: true, count: inserts.length });
    }

    throw new Error("Unsupported action");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});