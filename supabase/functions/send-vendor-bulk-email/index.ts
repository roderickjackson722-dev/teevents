// Sends a bulk email to a filtered set of vendor registrations for one tournament.
// Each recipient gets an individual email (To: header is just them).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER_EMAIL = "notifications@notifications.teevents.golf";
const SENDER_NAME = "TeeVents Golf Management";

interface BulkBody {
  tournament_id: string;
  organization_id: string;
  recipient_ids: string[]; // vendor_registrations.id[]
  subject: string;
  body_html: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as BulkBody;
    const { tournament_id, organization_id, recipient_ids, subject, body_html } = body;
    if (!tournament_id || !organization_id || !recipient_ids?.length || !subject || !body_html) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (recipient_ids.length > 500) {
      return new Response(JSON.stringify({ error: "Too many recipients (max 500)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authz
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    let allowed = !!isAdmin;
    if (!allowed) {
      const { data: isMember } = await supabaseAdmin.rpc("is_org_member", {
        _user_id: user.id, _org_id: organization_id,
      });
      allowed = !!isMember;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Fetch recipients (must belong to this tournament)
    const { data: vendors, error } = await supabaseAdmin
      .from("vendor_registrations")
      .select("id, contact_email, contact_name, vendor_name")
      .eq("tournament_id", tournament_id)
      .in("id", recipient_ids);
    if (error) throw error;
    if (!vendors?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const v of vendors as any[]) {
      try {
        const html = `
<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:24px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;margin:auto;">
    <tr><td style="padding:24px;color:#374151;line-height:1.6;">
      ${body_html}
    </td></tr>
    <tr><td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
      Sent by TeeVents on behalf of the tournament organizer.
    </td></tr>
  </table>
</body></html>`;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [v.contact_email],
            subject,
            html,
          }),
        });
        if (r.ok) sent++;
        else errors.push(`${v.contact_email}: ${r.status}`);
      } catch (e) {
        errors.push(`${v.contact_email}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ sent, total: vendors.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
