import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Private Arlington County RFP program modules: participant registration,
 * payment processing, scheduling / team admin, and communications.
 *
 * Every admin function asserts the platform-admin role. The only public
 * surface is the season sign-up page, which reads a single published season
 * and writes one registration row through a controlled server routine.
 */

async function adminOnly(context: any) {
  const { getAdminClient, assertAdmin } = await import("./security.server");
  await assertAdmin(context.supabase, context.userId);
  return (await getAdminClient()) as any;
}

async function serviceClient() {
  const { getAdminClient } = await import("./security.server");
  return (await getAdminClient()) as any;
}

const FROM_EMAIL = "TeeVents <info@teevents.golf>";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return { ok: false, error: "Email service is not configured" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) return { ok: false, error: `Email send failed (${res.status})` };
  return { ok: true };
}

async function sendSms(to: string, body: string) {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_PHONE_NUMBER"];
  if (!sid || !token || !from) return { ok: false, error: "Text messaging is not configured" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  if (!res.ok) return { ok: false, error: `Text send failed (${res.status})` };
  return { ok: true };
}

async function stripeForm(path: string, params: Record<string, string>) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Payment request failed");
  return json;
}

async function stripeGet(path: string) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Payment lookup failed");
  return json;
}

/* ------------------------------ registrations ------------------------------ */

export const listRfpRegistrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [regs, seasons, sports, teams, forms] = await Promise.all([
      admin.from("rfp_registrations").select("*").order("registration_date", { ascending: false }),
      admin.from("seasons").select("id, name, sport_type, public_slug, description, registration_open, registration_fee_cents").order("name"),
      admin.from("sport_settings").select("id, label, sport_type").order("label"),
      admin.from("season_teams").select("id, season_id, team_name, division, coach_name, coach_email").order("team_name"),
      admin.from("rfp_registration_forms").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      registrations: regs.data || [],
      seasons: seasons.data || [],
      sports: sports.data || [],
      teams: teams.data || [],
      forms: forms.data || [],
    };
  });

const registrationInput = z.object({
  id: z.string().uuid().optional(),
  season_id: z.string().uuid().nullable().optional(),
  sport_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  participant_name: z.string().trim().min(1).max(120),
  participant_email: z.string().trim().email().max(255),
  participant_phone: z.string().trim().max(40).optional().nullable(),
  date_of_birth: z.string().trim().max(20).optional().nullable(),
  waiver_signed: z.boolean().optional(),
  payment_status: z.enum(["pending", "paid", "refunded"]).optional(),
  payment_amount_cents: z.number().int().min(0).max(10_000_000).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const upsertRfpRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registrationInput.parse(d))
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      season_id: data.season_id || null,
      sport_id: data.sport_id || null,
      team_id: data.team_id || null,
      participant_name: data.participant_name,
      participant_email: data.participant_email,
      participant_phone: data.participant_phone || null,
      date_of_birth: data.date_of_birth || null,
      waiver_signed: !!data.waiver_signed,
      payment_status: data.payment_status || "pending",
      payment_amount_cents: data.payment_amount_cents ?? 0,
      notes: data.notes || null,
    };
    const { error } = data.id
      ? await admin.from("rfp_registrations").update(row).eq("id", data.id)
      : await admin.from("rfp_registrations").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRfpRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("rfp_registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------- registration forms --------------------------- */

export const upsertRfpForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      name: String(data.name || "Registration Form").trim(),
      sport_id: data.sport_id || null,
      season_id: data.season_id || null,
      is_active: data.is_active !== false,
      form_config: data.form_config || { fields: [], waivers: [], documents: [] },
    };
    const { error } = data.id
      ? await admin.from("rfp_registration_forms").update(row).eq("id", data.id)
      : await admin.from("rfp_registration_forms").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRfpForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("rfp_registration_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Season program settings used by the private public sign-up link. */
export const saveRfpSeasonProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const slug = String(data.public_slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const { error } = await admin
      .from("seasons")
      .update({
        public_slug: slug || null,
        description: data.description || null,
        registration_open: !!data.registration_open,
        registration_fee_cents: Number(data.registration_fee_cents) || 0,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, slug };
  });

/* ------------------------------- payments --------------------------------- */

export const refundRfpRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; amountCents?: number }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { data: reg } = await admin
      .from("rfp_registrations")
      .select("id, payment_amount_cents, refund_amount_cents, stripe_payment_intent_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!reg) throw new Error("Registration not found");

    const already = Number(reg.refund_amount_cents) || 0;
    const max = Math.max(0, (Number(reg.payment_amount_cents) || 0) - already);
    const amount = Math.min(Number(data.amountCents) || max, max);
    if (amount <= 0) throw new Error("Nothing left to refund");

    if (reg.stripe_payment_intent_id) {
      await stripeForm("refunds", {
        payment_intent: reg.stripe_payment_intent_id,
        amount: String(amount),
      });
    }

    const total = already + amount;
    const full = total >= (Number(reg.payment_amount_cents) || 0);
    const { error } = await admin
      .from("rfp_registrations")
      .update({
        refund_amount_cents: total,
        refund_status: full ? "full" : "partial",
        payment_status: full ? "refunded" : "paid",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, refunded_cents: total, simulated: !reg.stripe_payment_intent_id };
  });

/* ------------------------------- scheduling -------------------------------- */

export const listRfpSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [events, facilities, seasons, teams] = await Promise.all([
      admin.from("rfp_schedule_events").select("*").order("event_date").order("start_time"),
      admin.from("facilities").select("id, name, facility_type").order("name"),
      admin.from("seasons").select("id, name, sport_type").order("name"),
      admin.from("season_teams").select("id, season_id, team_name, division, coach_name, coach_email").order("team_name"),
    ]);
    return {
      events: events.data || [],
      facilities: facilities.data || [],
      seasons: seasons.data || [],
      teams: teams.data || [],
    };
  });

export const upsertRfpScheduleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const row = {
      facility_id: data.facility_id || null,
      season_id: data.season_id || null,
      team_id: data.team_id || null,
      opponent_team_id: data.opponent_team_id || null,
      title: data.title || null,
      event_type: data.event_type || "game",
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time,
      status: data.status || "scheduled",
      notes: data.notes || null,
    };
    if (!row.event_date || !row.start_time || !row.end_time) {
      throw new Error("Date, start time and end time are required");
    }
    // Keep one facility from being double-booked at the same time.
    if (row.facility_id) {
      const { data: clash } = await admin
        .from("rfp_schedule_events")
        .select("id, title, start_time, end_time")
        .eq("facility_id", row.facility_id)
        .eq("event_date", row.event_date)
        .neq("status", "cancelled")
        .lt("start_time", row.end_time)
        .gt("end_time", row.start_time);
      if ((clash || []).some((c: any) => c.id !== data.id) && row.status !== "cancelled") {
        throw new Error("That facility is already booked for this time window.");
      }
    }
    const { error } = data.id
      ? await admin.from("rfp_schedule_events").update(row).eq("id", data.id)
      : await admin.from("rfp_schedule_events").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRfpScheduleEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("rfp_schedule_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------- communications ------------------------------ */

export const listRfpCommunications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const admin = await adminOnly(context);
    const [messages, seasons, teams] = await Promise.all([
      admin.from("rfp_communications").select("*").order("created_at", { ascending: false }).limit(200),
      admin.from("seasons").select("id, name").order("name"),
      admin.from("season_teams").select("id, season_id, team_name, coach_name, coach_email").order("team_name"),
    ]);
    return { messages: messages.data || [], seasons: seasons.data || [], teams: teams.data || [] };
  });

const commInput = z.object({
  season_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  recipient_type: z.enum(["all", "coaches", "parents", "players", "team"]),
  communication_type: z.enum(["email", "sms"]),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(5000),
  scheduled_for: z.string().trim().optional().nullable(),
});

export const sendRfpCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => commInput.parse(d))
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);

    // Build the recipient list from registrations (and coaches from teams).
    let recipients: string[] = [];
    if (data.recipient_type === "coaches") {
      let q = admin.from("season_teams").select("coach_email, season_id");
      if (data.season_id) q = q.eq("season_id", data.season_id);
      const { data: teams } = await q;
      recipients = (teams || []).map((t: any) => t.coach_email).filter(Boolean);
    } else {
      let q = admin.from("rfp_registrations").select("participant_email, participant_phone, season_id, team_id");
      if (data.season_id) q = q.eq("season_id", data.season_id);
      if (data.team_id) q = q.eq("team_id", data.team_id);
      const { data: regs } = await q;
      recipients = (regs || [])
        .map((r: any) => (data.communication_type === "sms" ? r.participant_phone : r.participant_email))
        .filter(Boolean);
    }
    recipients = Array.from(new Set(recipients));

    const base = {
      season_id: data.season_id || null,
      team_id: data.team_id || null,
      sender_id: context.userId,
      recipient_type: data.recipient_type,
      communication_type: data.communication_type,
      subject: data.subject || null,
      message: data.message,
      recipient_count: recipients.length,
    };

    if (data.scheduled_for) {
      const { error } = await admin
        .from("rfp_communications")
        .insert({ ...base, status: "scheduled", scheduled_for: data.scheduled_for });
      if (error) throw new Error(error.message);
      return { ok: true, scheduled: true, recipients: recipients.length };
    }

    if (!recipients.length) throw new Error("No recipients matched that selection");

    let failures = 0;
    let lastError: string | null = null;
    for (const to of recipients) {
      const result =
        data.communication_type === "sms"
          ? await sendSms(to, data.message)
          : await sendEmail(
              to,
              data.subject || "Program update",
              `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">${data.message.replace(/\n/g, "<br/>")}</div>`,
            );
      if (!result.ok) {
        failures++;
        lastError = result.error || "Send failed";
      }
    }

    const { error } = await admin.from("rfp_communications").insert({
      ...base,
      status: failures === recipients.length ? "failed" : failures ? "partial" : "sent",
      sent_at: new Date().toISOString(),
      error_message: lastError,
    });
    if (error) throw new Error(error.message);
    return { ok: failures < recipients.length, sent: recipients.length - failures, failed: failures, error: lastError };
  });

export const deleteRfpCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const admin = await adminOnly(context);
    const { error } = await admin.from("rfp_communications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------- public registration page ----------------------- */

export const getRfpPublicSeason = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data }: any) => {
    const admin = await serviceClient();
    const { data: season } = await admin
      .from("seasons")
      .select("id, name, description, sport_type, start_date, end_date, registration_open, registration_fee_cents")
      .eq("public_slug", data.slug)
      .maybeSingle();
    if (!season || !season.registration_open) return { season: null, form: null, teams: [] };
    const [{ data: form }, { data: teams }] = await Promise.all([
      admin
        .from("rfp_registration_forms")
        .select("id, name, form_config")
        .eq("season_id", season.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from("season_teams").select("id, team_name, division").eq("season_id", season.id).order("team_name"),
    ]);
    return { season, form: form || null, teams: teams || [] };
  });

const publicRegInput = z.object({
  slug: z.string().trim().min(1).max(120),
  participant_name: z.string().trim().min(1).max(120),
  participant_email: z.string().trim().email().max(255),
  participant_phone: z.string().trim().max(40).optional().nullable(),
  date_of_birth: z.string().trim().max(20).optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  waiver_signed: z.boolean(),
  responses: z.record(z.string(), z.string().max(1000)).optional(),
  origin: z.string().trim().url().max(300),
});

export const submitRfpRegistration = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => publicRegInput.parse(d))
  .handler(async ({ data }: any) => {
    const admin = await serviceClient();
    const { data: season } = await admin
      .from("seasons")
      .select("id, name, sport_type, registration_open, registration_fee_cents")
      .eq("public_slug", data.slug)
      .maybeSingle();
    if (!season || !season.registration_open) throw new Error("Registration is not open for this program");
    if (!data.waiver_signed) throw new Error("The waiver must be accepted to register");

    const fee = Number(season.registration_fee_cents) || 0;
    const { data: inserted, error } = await admin
      .from("rfp_registrations")
      .insert({
        season_id: season.id,
        team_id: data.team_id || null,
        participant_name: data.participant_name,
        participant_email: data.participant_email,
        participant_phone: data.participant_phone || null,
        date_of_birth: data.date_of_birth || null,
        waiver_signed: true,
        responses: data.responses || {},
        payment_amount_cents: fee,
        payment_status: fee > 0 ? "pending" : "paid",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (fee <= 0) {
      await sendEmail(
        data.participant_email,
        `You're registered for ${season.name}`,
        `<p>Hi ${data.participant_name},</p><p>Your registration for <strong>${season.name}</strong> is confirmed. No payment was required.</p>`,
      );
      return { registrationId: inserted.id, checkoutUrl: null };
    }

    const session = await stripeForm("checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(fee),
      "line_items[0][price_data][product_data][name]": `${season.name} registration`,
      "line_items[0][quantity]": "1",
      customer_email: data.participant_email,
      success_url: `${data.origin}/rfp/register/${data.slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/rfp/register/${data.slug}?canceled=1`,
      "metadata[rfp_registration_id]": inserted.id,
    });

    await admin
      .from("rfp_registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", inserted.id);

    return { registrationId: inserted.id, checkoutUrl: session.url as string };
  });

export const confirmRfpRegistrationPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ sessionId: z.string().trim().min(5).max(200) }).parse(d))
  .handler(async ({ data }: any) => {
    const admin = await serviceClient();
    const session = await stripeGet(`checkout/sessions/${data.sessionId}`);
    if (session.payment_status !== "paid") return { paid: false };

    const regId = session.metadata?.rfp_registration_id;
    if (!regId) return { paid: false };
    const { data: reg } = await admin
      .from("rfp_registrations")
      .select("id, participant_name, participant_email, payment_status, season_id")
      .eq("id", regId)
      .maybeSingle();
    if (!reg) return { paid: false };

    if (reg.payment_status !== "paid") {
      await admin
        .from("rfp_registrations")
        .update({
          payment_status: "paid",
          payment_amount_cents: Number(session.amount_total) || 0,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("id", regId);
      const { data: season } = await admin
        .from("seasons")
        .select("name")
        .eq("id", reg.season_id)
        .maybeSingle();
      await sendEmail(
        reg.participant_email,
        `Payment received — ${season?.name || "program registration"}`,
        `<p>Hi ${reg.participant_name},</p><p>We received your payment and your registration is confirmed.</p>`,
      );
    }
    return { paid: true, name: reg.participant_name };
  });
