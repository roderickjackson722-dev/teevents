// Sends the "Sponsor Event Day Details" email to selected sponsors of a tournament.
// Recipient addresses are resolved server-side from sponsor_registrations so the
// caller can only email sponsors that belong to the tournament they manage.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "info@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

interface Body {
  tournament_id: string;
  organization_id: string;
  emails: { sponsor_id: string; subject: string; html: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { tournament_id, organization_id, emails } = (await req.json()) as Body;
    if (!tournament_id || !organization_id || !Array.isArray(emails) || emails.length === 0) {
      return json({ error: "Missing fields" }, 400);
    }
    if (emails.length > 300) return json({ error: "Too many recipients (max 300)" }, 400);

    // Authz: platform admin or a member of the owning organization
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    let allowed = !!isAdmin;
    if (!allowed) {
      const { data: isMember } = await supabaseAdmin.rpc("is_org_member", {
        _user_id: user.id, _org_id: organization_id,
      });
      allowed = !!isMember;
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { data: sponsors, error } = await supabaseAdmin
      .from("sponsor_registrations")
      .select("id, contact_email, company_name")
      .eq("tournament_id", tournament_id)
      .in("id", emails.map((e) => e.sponsor_id));
    if (error) throw error;

    const byId = new Map((sponsors || []).map((s: any) => [s.id, s]));

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    let sent = 0;
    const errors: string[] = [];
    for (const e of emails) {
      const sponsor: any = byId.get(e.sponsor_id);
      if (!sponsor?.contact_email) {
        errors.push(`${e.sponsor_id}: no email on file`);
        continue;
      }
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [sponsor.contact_email],
            subject: e.subject || "Sponsor Event Day Details",
            html: e.html,
          }),
        });
        if (r.ok) sent++;
        else errors.push(`${sponsor.contact_email}: ${r.status} ${await r.text()}`);
      } catch (err) {
        errors.push(`${sponsor.contact_email}: ${(err as Error).message}`);
      }
    }

    return json({ sent, total: emails.length, errors });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
