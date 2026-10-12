import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ orgId: z.string().uuid() });
const SITE = "https://www.teevents.golf";
const FROM = "TeeVents Golf Management <info@notifications.teevents.golf>";

/** Emails the organizer and the TeeVents team a summary after onboarding is finished. */
export const sendOnboardingSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["RESEND_API_KEY"];
    if (!key) return { ok: false };
    const sb = context.supabase as any;
    const [{ data: tb }, { data: org }] = await Promise.all([
      sb.from("organizer_toolboxes").select("*").eq("organization_id", data.orgId).maybeSingle(),
      sb.from("organizations").select("name").eq("id", data.orgId).maybeSingle(),
    ]);
    if (!tb || !org) return { ok: false };
    const claims = context.claims as any;
    const meta = claims?.user_metadata || {};
    const email: string | undefined = claims?.email;
    const name = meta.full_name || meta.legal_name || meta.name || [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "Organizer";
    const phone = meta.phone || "Not provided";
    const ev = (tb.onboarding_event || {}) as Record<string, string>;
    const c = tb.brand_colors || {};
    const assets: [string, number | boolean][] = [
      ["Event logo", !!tb.logo], ["Brand colors", !!(c.primary || c.secondary || c.accent)], ["Hero image", !!tb.hero_image],
      ["Sponsor logos", tb.sponsor_logos?.length || 0], ["Event documents", tb.documents?.length || 0], ["Photo gallery", tb.gallery?.length || 0],
      ["Additional notes", !!(tb.additional_notes || "").trim()],
    ];
    const assetLines = assets.map(([l, v]) => `${l}: ${typeof v === "number" ? `${v} uploaded` : v ? "Provided" : "Not yet"}`);
    const eventLines = [
      `Event name: ${ev.name || "Not provided"}`, `Event date: ${ev.date || "Not provided"}`, `Location: ${ev.location || "Not provided"}`,
      `City and state: ${ev.cityState || "Not provided"}`, `Event type: ${ev.type || "Not provided"}`, `Format: ${ev.format || "Not provided"}`,
      `Number of holes: ${ev.holes || "Not provided"}`, `Expected players: ${ev.players || "Not provided"}`, `Plan selected: ${ev.plan || "Not provided"}`,
      `Event page choice: ${tb.onboarding_choice || "Not selected"}`,
    ];
    const needed = [...(ev.name ? [] : ["Event details"]), ...(tb.logo ? [] : ["Event logo"])];
    const send = (to: string[], subject: string, text: string) => fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, text, ...(email && to[0] === "info@teevents.golf" ? { reply_to: email } : {}) }),
      signal: AbortSignal.timeout(15000),
    });
    const results = await Promise.allSettled([
      email ? send([email], "You are all set on TeeVents", [
        `Hi ${name},`, "", "Thank you for finishing your TeeVents setup. Here is what you shared with us:", "", ...eventLines, "",
        "Organizer Toolbox:", ...assetLines, "",
        needed.length ? `Still needed from you: ${needed.join(", ")}.` : "We have everything we need to get started.", "",
        "Your dedicated TeeVents rep will contact you within 1 business day.", "",
        `Your dashboard: ${SITE}/dashboard`, `Your Organizer Toolbox: ${SITE}/dashboard/toolbox`, "", "TeeVents Golf Management",
      ].join("\n")) : Promise.resolve(null),
      send(["info@teevents.golf"], `Onboarding completed: ${org.name}`, [
        `Organizer: ${name}`, `Email: ${email || "Not provided"}`, `Phone: ${phone}`, `Organization: ${org.name}`, "", ...eventLines, "",
        "Uploaded assets:", ...assetLines, "", `Organizer Toolbox: ${SITE}/admin/organizer-toolboxes`,
      ].join("\n")),
    ]);
    return { ok: results.every(r => r.status === "fulfilled" && (!r.value || r.value.ok)) };
  });
