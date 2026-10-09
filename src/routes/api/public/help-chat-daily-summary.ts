// Daily email (pg_cron) to info@teevents.golf with every organizer help chat from
// the last 24 hours. Always sends only to the fixed TeeVents inbox, so no caller
// data is ever returned.
import { createFileRoute } from "@tanstack/react-router";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

export const Route = createFileRoute("/api/public/help-chat-daily-summary")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: msgs } = await (supabaseAdmin as any)
          .from("help_chat_messages")
          .select("user_id, user_email, role, content, needs_human, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(5000);
        if (!msgs?.length) return Response.json({ sent: false });

        const byUser = new Map<string, any[]>();
        for (const m of msgs) { const a = byUser.get(m.user_id) || []; a.push(m); byUser.set(m.user_id, a); }
        const sections = [...byUser.values()].map((list) => {
          const flagged = list.some((m) => m.needs_human);
          return `<h3 style="color:#1a5c38;margin-top:24px">${esc(list[0].user_email || "Organizer")}${flagged ? " — needs human help" : ""}</h3>` +
            list.map((m) => `<p style="margin:4px 0"><strong>${m.role === "user" ? "Organizer" : "AI"}</strong> <span style="color:#6b7280;font-size:12px">${new Date(m.created_at).toLocaleString("en-US", { timeZone: "America/New_York" })}</span><br/>${esc(m.content).replace(/\n/g, "<br/>")}</p>`).join("");
        }).join("<hr/>");

        const key = process.env["RESEND_API_KEY"];
        if (!key) return Response.json({ sent: false });
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: ["info@teevents.golf"],
            subject: `Daily help chat summary — ${byUser.size} organizer${byUser.size === 1 ? "" : "s"}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:680px"><h2>Help chats from the last 24 hours</h2>${sections}<p style="margin-top:24px"><a href="https://www.teevents.golf/admin/help-chats">View all chats in Admin</a></p></div>`,
          }),
        });
        return Response.json({ sent: res.ok });
      },
    },
  },
});
