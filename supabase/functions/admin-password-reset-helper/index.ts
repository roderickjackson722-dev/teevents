import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SITE_URL = "https://www.teevents.golf";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- Verify caller is a platform admin ----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: callerData } = await admin.auth.getUser(token);
    const caller = callerData?.user;
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    // ---- Search organizers by email ----
    if (action === "search") {
      const q = String(body?.email ?? "").trim().toLowerCase();
      if (q.length < 3) return json({ error: "Enter at least 3 characters" }, 400);

      const matches: Array<Record<string, unknown>> = [];
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return json({ error: error.message }, 400);
        const users = data?.users ?? [];
        for (const u of users) {
          if ((u.email ?? "").toLowerCase().includes(q)) {
            matches.push({
              id: u.id,
              email: u.email,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
              banned: Boolean((u as { banned_until?: string }).banned_until),
            });
          }
        }
        if (users.length < 200) break;
        if (matches.length >= 50) break;
      }

      // Enrich with organization / league names
      for (const m of matches) {
        const { data: orgs } = await admin
          .from("org_members")
          .select("role, organizations(name)")
          .eq("user_id", m.id as string);
        m.organizations = (orgs ?? [])
          .map((o: { organizations?: { name?: string } | null }) => o.organizations?.name)
          .filter(Boolean);
      }

      return json({ users: matches });
    }

    // ---- Generate a one-time reset link (24h) ----
    if (action === "generate") {
      const email = String(body?.email ?? "").trim().toLowerCase();
      const sendEmail = Boolean(body?.send_email);
      const name = String(body?.name ?? "").trim();
      if (!email) return json({ error: "Email is required" }, 400);

      const redirectTo = `${SITE_URL}/reset-password`;
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (error) return json({ error: error.message }, 400);

      const link = data?.properties?.action_link as string | undefined;
      const hashedToken = (data?.properties?.hashed_token as string | undefined) ?? "";
      if (!link) return json({ error: "Could not generate reset link" }, 400);

      let emailed = false;
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (sendEmail && RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "TeeVents Golf Management <info@notifications.teevents.golf>",
            to: [email],
            reply_to: "info@teevents.golf",
            subject: "Password Reset Request – TeeVents",
            html: `
              <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color:#111827;">
                <h2 style="color:#1a5c38; margin-top:0;">Password Reset Request</h2>
                <p>Hello ${name || "there"},</p>
                <p>A password reset has been requested for your TeeVents account.</p>
                <p>Click the link below to reset your password:</p>
                <p style="margin:24px 0;">
                  <a href="${link}" style="display:inline-block; background:#F5A623; color:#1a5c38; padding:14px 28px; border-radius:6px; text-decoration:none; font-weight:bold;">
                    Reset My Password
                  </a>
                </p>
                <p style="color:#6b7280; font-size:14px;">This link expires in 24 hours.</p>
                <p style="color:#6b7280; font-size:14px;">
                  If you did not request this password reset, please contact us immediately at
                  <a href="mailto:info@teevents.golf">info@teevents.golf</a>.
                </p>
                <p style="margin-top:24px;">Best,<br/>TeeVents Golf Management</p>
              </div>
            `,
          }),
        });
        emailed = res.ok;
      }

      await admin.from("admin_password_resets").insert({
        admin_id: caller.id,
        user_id: (data?.user?.id as string | undefined) ?? null,
        target_email: email,
        reset_token: hashedToken || crypto.randomUUID(),
        emailed,
      });

      return json({ link, emailed, expires_in_hours: 24 });
    }

    // ---- Recent audit log ----
    if (action === "log") {
      const { data, error } = await admin
        .from("admin_password_resets")
        .select("id, target_email, emailed, created_at, expires_at, used_at, admin_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 400);
      return json({ log: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
