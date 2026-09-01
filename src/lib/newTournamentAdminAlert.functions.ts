import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SENDER = "TeeVents Golf Management <info@notifications.teevents.golf>";
const ADMIN_EMAIL = "info@teevents.golf";

interface Input {
  tournamentId: string;
}

/**
 * Emails the platform admin when an organizer creates a new tournament.
 * Best-effort: never blocks tournament creation.
 */
export const notifyAdminNewTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => {
    if (!data?.tournamentId) throw new Error("tournamentId is required");
    return { tournamentId: data.tournamentId };
  })
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, slug, date, course_name, location, organization_id, created_at")
      .eq("id", data.tournamentId)
      .maybeSingle();
    if (!t) return { sent: false };

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, contact_email")
      .eq("id", (t as any).organization_id)
      .maybeSingle();

    const resendKey = process.env["RESEND_API_KEY"];
    if (!resendKey) return { sent: false };

    const rows: Array<[string, string]> = [
      ["Tournament", (t as any).title || "Untitled"],
      ["Organization", (org as any)?.name || "—"],
      ["Organizer contact", (org as any)?.contact_email || "—"],
      ["Date", (t as any).tournament_date || "Not set"],
      ["Course", (t as any).course_name || "Not set"],
      ["Location", (t as any).location || "Not set"],
      ["Created by (user id)", userId],
      ["Public page", (t as any).slug ? `https://www.teevents.golf/t/${(t as any).slug}` : "Not published"],
    ];

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111">
        <h2 style="color:#1a5c38;margin:0 0 12px">New Tournament Created</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
          ${rows
            .map(
              ([k, v]) =>
                `<tr><td style="color:#666">${k}</td><td style="font-weight:600">${String(v)}</td></tr>`,
            )
            .join("")}
        </table>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [ADMIN_EMAIL],
        subject: `New tournament created: ${(t as any).title || "Untitled"}`,
        html,
      }),
    });
    if (!res.ok) return { sent: false };
    return { sent: true };
  });
