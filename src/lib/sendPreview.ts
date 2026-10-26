/**
 * Read-only helpers for Enterprise send previews. They mirror the rules the
 * existing delivery code already uses so a preview can show who will receive a
 * message and what it will say. Nothing here sends, schedules or writes data,
 * and the real delivery code does not import these helpers.
 */

export type PreviewRecipient = { id: string; name: string; address: string; note?: string };

const nameOf = (r: any) => `${r?.first_name || ""} ${r?.last_name || ""}`.trim() || "Player";

/* ---------------- Text messages ---------------- */

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

/** Characters and carrier message parts (segments) for one text. */
export function smsSegments(text: string): { characters: number; segments: number; encoding: "GSM-7" | "Unicode" } {
  const chars = Array.from(text);
  const isGsm = chars.every((c) => GSM_BASIC.includes(c) || GSM_EXTENDED.includes(c));
  if (!text.length) return { characters: 0, segments: 0, encoding: "GSM-7" };
  if (isGsm) {
    const units = chars.reduce((n, c) => n + (GSM_EXTENDED.includes(c) ? 2 : 1), 0);
    return { characters: chars.length, segments: units <= 160 ? 1 : Math.ceil(units / 153), encoding: "GSM-7" };
  }
  const units = text.length; // UTF-16 code units
  return { characters: chars.length, segments: units <= 70 ? 1 : Math.ceil(units / 67), encoding: "Unicode" };
}

/** Same fill-in rules as the immediate text send. */
export function personalizeSms(template: string, reg: any, tournament: any): string {
  const t = tournament || {};
  const leaderboardLink = t.slug ? `https://www.teevents.golf/live/${t.slug}` : "https://www.teevents.golf";
  const map: Record<string, string> = {
    first_name: reg?.first_name ?? "",
    last_name: reg?.last_name ?? "",
    tournament_name: t.title ?? "",
    course_name: t.course_name ?? "",
    event_date: t.date ?? "",
    tee_time: reg?.tee_time ?? reg?.starting_tee_time ?? "",
    starting_hole: reg?.starting_hole != null ? String(reg.starting_hole) : reg?.group_number != null ? String(reg.group_number) : "",
    team_name: reg?.team_name ?? "",
    scoring_code: reg?.scoring_code ?? "",
    leaderboard_link: leaderboardLink,
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in map ? map[key] : m));
}

export type SmsRecipientInput = {
  mode: "now" | "schedule";
  audience: "registered" | "manual";
  registrations: any[];
  manualNumbers: string[];
  creditsRemaining: number; // Infinity when unlimited
};

/**
 * Who the existing text sends deliver to:
 * - now + manual: every number typed.
 * - now + registered: players with a phone, capped at remaining texts.
 * - scheduled: always registered players with a phone at send time (typed numbers are not used).
 */
export function smsRecipients(input: SmsRecipientInput): { recipients: PreviewRecipient[]; skippedForCredits: number; manualIgnored: boolean } {
  const withPhone = input.registrations.filter((r) => r?.phone && String(r.phone).trim() !== "");
  if (input.mode === "schedule") {
    return {
      recipients: withPhone.map((r) => ({ id: r.id, name: nameOf(r), address: r.phone })),
      skippedForCredits: 0,
      manualIgnored: input.audience === "manual",
    };
  }
  let list: PreviewRecipient[] = input.audience === "manual"
    ? input.manualNumbers.map((p, i) => ({ id: `manual-${i}`, name: "Manual", address: p }))
    : withPhone.map((r) => ({ id: r.id, name: nameOf(r), address: r.phone }));
  let skipped = 0;
  if (Number.isFinite(input.creditsRemaining) && list.length > input.creditsRemaining) {
    skipped = list.length - input.creditsRemaining;
    list = list.slice(0, Math.max(0, input.creditsRemaining));
  }
  return { recipients: list, skippedForCredits: skipped, manualIgnored: false };
}

/* ---------------- Emails ---------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hand-picked template send: alternate address replaces or adds to the registered one. */
export function templateEmailRecipients(
  registrations: any[],
  ids: string[],
  altEmails: Record<string, string> = {},
  altMode: Record<string, "alt" | "both"> = {},
): PreviewRecipient[] {
  const byId = new Map(registrations.map((r) => [r.id, r]));
  const out: PreviewRecipient[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) continue;
    const alt = (altEmails[id] || "").trim();
    if (alt) {
      out.push({ id, name: nameOf(r), address: alt, note: "Alternate address" });
      if ((altMode[id] || "alt") === "both" && r.email) out.push({ id: `${id}-registered`, name: nameOf(r), address: r.email, note: "Registered address" });
    } else if (r.email) {
      out.push({ id, name: nameOf(r), address: r.email });
    } else {
      out.push({ id, name: nameOf(r), address: "", note: "No email on file, will not be delivered" });
    }
  }
  return out;
}

/** Day-before reminder sent to everyone: paid players only. */
export function dayBeforeAllRecipients(registrations: any[]): PreviewRecipient[] {
  return registrations
    .filter((r) => String(r?.payment_status || "").toLowerCase() === "paid")
    .map((r) => (r.email
      ? { id: r.id, name: nameOf(r), address: r.email }
      : { id: r.id, name: nameOf(r), address: "", note: "No email on file, will not be delivered" }));
}

/** Scheduled template email: who the scheduler resolves at send time. */
export function scheduledEmailRecipients(opts: {
  templateKind: string;
  audience: "all" | "selected";
  selectedIds: string[];
  testEmail: string;
  registrations: any[];
}): PreviewRecipient[] {
  const test = opts.testEmail.trim();
  if (test) return EMAIL.test(test) ? [{ id: "test", name: "Test copy", address: test, note: "Only this address receives it" }] : [];
  if (opts.audience === "selected") return templateEmailRecipients(opts.registrations, opts.selectedIds);
  if (opts.templateKind === "day_before") return dayBeforeAllRecipients(opts.registrations);
  return opts.registrations.filter((r) => r?.email).map((r) => ({ id: r.id, name: nameOf(r), address: r.email }));
}
