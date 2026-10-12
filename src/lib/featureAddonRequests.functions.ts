import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEATURE_ADDONS, COLLEGE_ADDON_AMOUNTS } from "./featureAddonCatalog";

const requestSchema = z.object({
  addonKey: z.string().refine(k => Object.hasOwn(FEATURE_ADDONS, k)),
  eventName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: z.string().trim().min(7).max(40),
  contactNotes: z.string().trim().max(1000).optional(),
  divisions: z.number().int().min(1).max(4).default(1),
  discountCode: z.string().trim().max(50).optional(),
});

export const startFeatureAddonRequest = createServerFn({ method: "POST" })
  .inputValidator(input => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const origin = new URL(headers.get("origin") || "https://www.teevents.golf").origin;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const ip = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: rate, error: rateError } = await admin.rpc("check_auth_rate_limit", { _ip: ip, _action: "feature_addon_checkout", _max: 8, _window_seconds: 600 });
    if (rateError || rate?.allowed === false) throw new Error("Please wait a few minutes before trying again.");
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Payments are not configured");
    const item = FEATURE_ADDONS[data.addonKey];
    if (!item) throw new Error("Unknown add-on");
    const overrideKey = data.addonKey === "college_scoring" ? `college_scoring_${data.divisions}` : data.addonKey;
    const { data: priceOverride } = await admin.from("admin_addon_pricing").select("price_cents").eq("addon_key", overrideKey).maybeSingle();
    let amount = priceOverride?.price_cents ?? (data.addonKey === "college_scoring" ? COLLEGE_ADDON_AMOUNTS[data.divisions] : item.cents);
    if (data.discountCode) {
      const { data: code } = await admin.from("addon_discount_codes").select("discount_percent, addon_key, expires_at").eq("code", data.discountCode.toUpperCase()).maybeSingle();
      if (!code || (code.expires_at && new Date(code.expires_at) <= new Date()) || (code.addon_key && code.addon_key !== data.addonKey)) throw new Error("Discount code is not valid for this add-on.");
      amount = Math.max(0, Math.round(amount * (1 - Math.min(100, Math.max(0, code.discount_percent)) / 100)));
    }
    const { data: row, error } = await admin.from("feature_addon_requests").insert({ addon_key: data.addonKey, event_name: data.eventName, contact_name: data.contactName, contact_email: data.contactEmail, contact_phone: data.contactPhone, contact_notes: data.contactNotes || null, divisions: data.divisions, amount_cents: amount }).select("id").single();
    if (error || !row) throw new Error("Could not save your purchase details");
    const body = new URLSearchParams({
      mode: "payment", customer_email: data.contactEmail,
      "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][product_data][name]": `TeeVents ${item.name}`,
      "line_items[0][price_data][product_data][description]": `Event: ${data.eventName}`,
      success_url: `${origin}/addon-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      "metadata[type]": "feature_addon_request", "metadata[request_id]": row.id,
      "metadata[addon_key]": data.addonKey,
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    const session = await response.json() as any;
    if (!response.ok || !session.url) throw new Error("Could not start payment. Please try again.");
    const saved = await admin.from("feature_addon_requests").update({ stripe_session_id: session.id }).eq("id", row.id);
    if (saved.error) throw new Error("Could not link payment. Please try again.");
    return { url: session.url as string };
  });

export const confirmFeatureAddonRequest = createServerFn({ method: "POST" })
  .inputValidator(input => z.object({ sessionId: z.string().regex(/^cs_[A-Za-z0-9_]+$/).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) throw new Error("Payments are not configured");
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.sessionId)}`, { headers: { Authorization: `Bearer ${key}` } });
    const session = await response.json() as any;
    if (!response.ok || session.metadata?.type !== "feature_addon_request") throw new Error("Purchase not found");
    const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
    if (paid) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await (supabaseAdmin as any).from("feature_addon_requests").update({ status: "paid" }).eq("id", session.metadata.request_id).eq("stripe_session_id", session.id).eq("status", "pending");
      if (error) throw new Error("Could not confirm purchase");
    }
    return { paid };
  });

export const adminListFeatureAddonRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, getAdminClient } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data, error } = await admin.from("feature_addon_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const key = process.env["STRIPE_SECRET_KEY"];
    if (key) for (const r of (data || []).filter((r: any) => r.status === "pending" && r.stripe_session_id).slice(0, 10)) {
      try {
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(r.stripe_session_id)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3000) });
      const session = await response.json() as any;
      if (response.ok && session.metadata?.request_id === r.id && (session.payment_status === "paid" || session.payment_status === "no_payment_required")) {
        const result = await admin.from("feature_addon_requests").update({ status: "paid" }).eq("id", r.id).eq("status", "pending");
        if (!result.error) r.status = "paid";
      }
      } catch { /* Keep pending when the payment provider is unavailable. */ }
    }
    return { requests: data || [] };
  });

export const adminFulfillFeatureAddonRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ requestId: z.string().uuid(), tournamentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getAdminClient } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { data: request } = await admin.from("feature_addon_requests").select("*").eq("id", data.requestId).single();
    if (!request || request.status !== "paid") throw new Error("Confirm the purchase is paid before applying it.");
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key || !request.stripe_session_id) throw new Error("Payment verification unavailable");
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(request.stripe_session_id)}`, { headers: { Authorization: `Bearer ${key}` } });
    const session = await response.json() as any;
    if (!response.ok || session.metadata?.request_id !== request.id || !["paid", "no_payment_required"].includes(session.payment_status)) throw new Error("Payment has not been confirmed.");
    const { data: t } = await admin.from("tournaments").select("id, paid_features").eq("id", data.tournamentId).single();
    if (!t) throw new Error("Event not found");
    const patch: Record<string, unknown> = { paid_features: { ...(t.paid_features || {}), [request.addon_key]: true } };
    if (request.addon_key === "live_leaderboard") patch.live_leaderboard_enabled = true;
    if (request.addon_key === "branding_sponsor") Object.assign(patch, { branding_removed: true, branding_removed_paid: true, branding_removed_at: new Date().toISOString(), branding_payment_session_id: session.id, digital_sponsor_purchased: true });
    if (request.addon_key === "college_scoring") Object.assign(patch, { college_scoring_paid: true, college_scoring_purchased: true, college_scoring_divisions: request.divisions, college_scoring_divisions_purchased: request.divisions });
    const updated = await admin.from("tournaments").update(patch).eq("id", t.id);
    if (updated.error) throw new Error(updated.error.message);
    const saved = await admin.from("feature_addon_requests").update({ status: "fulfilled", tournament_id: t.id, fulfilled_by: context.userId, fulfilled_at: new Date().toISOString() }).eq("id", request.id);
    if (saved.error) throw new Error(saved.error.message);
    return { ok: true };
  });

export const adminSetEventLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ tournamentId: z.string().uuid(), enabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, getAdminClient } = await import("./security.server");
    await assertAdmin(context.supabase, context.userId);
    const admin = await getAdminClient();
    const { error } = await admin.from("tournaments").update({ live_leaderboard_enabled: data.enabled }).eq("id", data.tournamentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });