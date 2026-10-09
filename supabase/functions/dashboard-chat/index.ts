import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPPORT_EMAIL = "info@teevents.golf";
const HUMAN_MARKER = "[[HUMAN_HELP]]";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);

const systemPrompt = `You are the TeeVents Help Assistant inside the organizer dashboard of TeeVents, a golf tournament and league management platform.

YOUR ONLY JOB: answer questions about WHERE things are and HOW to navigate the TeeVents dashboard and website (which menu, page, tab, or button to use, and the steps to get there).

Navigation reference (left sidebar of the organizer dashboard):
- Dashboard home, Tournaments (create/edit events), Players (roster, add player/team, check-in, resend payment link), Pairings, Registration (ticket tiers, fields/questions, promo codes, add-ons), Website Builder / Webpage Layout (public page, section titles), Sponsors, Budget, Donations, Store, Auction, Raffles, Side Events, Volunteers, Surveys, Gallery, Messages / Email Templates (edit confirmation emails), Live Scoring & Leaderboard, Printables, Transactions (all payments, sign-ups and answers; Export CSV), Finances / Payouts, Payment Settings (connect Stripe), Team & Permissions, Share & Promote, Settings, Help Center.

RULES:
- You cannot and must never change, create, delete, refund, or configure anything on the platform. Never claim you did.
- Keep answers short, with numbered steps when helpful.
- If a question is NOT a navigation/"where do I find / how do I get to" question — for example billing or refund disputes, payment problems, bugs, something not working, account changes, data fixes, requests for the team to do something, or anything you are unsure about — do NOT try to solve it. Reply with exactly ${HUMAN_MARKER} on the first line, then one friendly sentence saying a TeeVents team member will follow up by email.
- Never invent features. If unsure where something is, use ${HUMAN_MARKER}.`;

async function createTicket(admin: any, user: any, orgId: string | null, question: string) {
  const { data: ticket } = await admin.from("help_tickets")
    .insert({ user_id: user.id, organization_id: orgId, user_email: user.email, question: question.slice(0, 4000) })
    .select("id").single();

  const { data: history } = await admin.from("help_chat_messages")
    .select("role, content, created_at").eq("user_id", user.id)
    .order("created_at", { ascending: true }).limit(200);
  let orgName = "";
  if (orgId) {
    const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).maybeSingle();
    orgName = org?.name || "";
  }
  const transcript = (history || []).map((m: any) =>
    `<p style="margin:6px 0"><strong>${m.role === "user" ? "Organizer" : "AI"}</strong> <span style="color:#6b7280;font-size:12px">${new Date(m.created_at).toLocaleString("en-US", { timeZone: "America/New_York" })}</span><br/>${esc(m.content).replace(/\n/g, "<br/>")}</p>`
  ).join("");
  const key = Deno.env.get("RESEND_API_KEY");
  if (key) {
    await sendAndLog(admin, key, {
      from: "TeeVents Golf Management <info@notifications.teevents.golf>",
      to: [SUPPORT_EMAIL],
      reply_to: user.email || undefined,
      subject: `🆘 Help ticket — ${orgName || user.email}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px">
        <h2 style="color:#1a5c38">New organizer help ticket</h2>
        <p><strong>Organizer:</strong> ${esc(user.email || "")}${orgName ? ` (${esc(orgName)})` : ""}</p>
        <p><strong>Question:</strong><br/>${esc(question)}</p>
        <p>View all chats in Admin → Help Chats: <a href="https://www.teevents.golf/admin/help-chats">teevents.golf/admin/help-chats</a></p>
        <hr/><h3>Full chat</h3>${transcript}</div>`,
    }, { templateName: "help-ticket", source: "dashboard-chat", organizationId: orgId });
  }
  return ticket?.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let user: any;
    try { user = await requireUser(req); }
    catch (r) { if (r instanceof Response) return json(JSON.parse(await r.text()), r.status); throw r; }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { data: mem } = await admin.from("org_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
    const orgId: string | null = body.organization_id || mem?.organization_id || null;

    // Manual "talk to a person" request.
    if (body.action === "ticket") {
      const q = String(body.question || "").trim() || "Organizer requested help from the TeeVents team.";
      await admin.from("help_chat_messages").insert({ user_id: user.id, organization_id: orgId, user_email: user.email, role: "user", content: q, needs_human: true });
      await admin.from("help_chat_messages").insert({ user_id: user.id, organization_id: orgId, user_email: user.email, role: "assistant", content: "Thanks — your request was sent to the TeeVents team. Someone will follow up by email.", needs_human: true });
      const id = await createTicket(admin, user, orgId, q);
      return json({ ok: true, ticket_id: id });
    }

    const text = String(body.message || "").trim().slice(0, 4000);
    if (!text) return json({ error: "Message is required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { data: prior } = await admin.from("help_chat_messages")
      .select("role, content").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20);
    const history = (prior || []).reverse().map((m: any) => ({ role: m.role, content: m.content }));

    await admin.from("help_chat_messages").insert({ user_id: user.id, organization_id: orgId, user_email: user.email, role: "user", content: text });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: text }],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const t = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, t);
      const msg = response.status === 429 ? "The assistant is busy. Please try again in a moment."
        : response.status === 402 ? "The assistant is temporarily unavailable."
        : "The assistant is temporarily unavailable.";
      return json({ error: msg }, response.status === 429 || response.status === 402 || response.status === 403 ? response.status : 500);
    }

    // Pipe the stream to the browser while collecting the full answer to save.
    let full = "";
    let buf = "";
    const decoder = new TextDecoder();
    const stream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        buf += decoder.decode(chunk, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try { full += JSON.parse(d).choices?.[0]?.delta?.content || ""; } catch { /* partial */ }
        }
      },
      async flush() {
        const needsHuman = full.includes(HUMAN_MARKER);
        const clean = full.replace(HUMAN_MARKER, "").trim() || "A TeeVents team member will follow up by email.";
        await admin.from("help_chat_messages").insert({ user_id: user.id, organization_id: orgId, user_email: user.email, role: "assistant", content: clean, needs_human: needsHuman });
        if (needsHuman) {
          await admin.from("help_chat_messages").update({ needs_human: true })
            .eq("user_id", user.id).eq("role", "user").eq("content", text);
          await createTicket(admin, user, orgId, text);
        }
      },
    });

    return new Response(response.body.pipeThrough(stream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dashboard-chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
