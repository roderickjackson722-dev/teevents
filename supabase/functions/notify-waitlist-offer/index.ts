import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { brandEmailHtml, brandSender, loadWhiteLabel } from "../_shared/whiteLabel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const waitlist_id = String(reqBody?.waitlist_id || "");
    const adminDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Caller must be a signed-in organizer of the waitlist's tournament (or a platform admin).
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: authData } = bearer ? await adminDb.auth.getUser(bearer) : { data: { user: null } } as any;
    const caller = authData?.user;
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Recipient, name and event come from the stored waitlist entry, never the request.
    const { data: entry } = waitlist_id
      ? await adminDb.from("tournament_waitlist").select("id, tournament_id, user_email, user_name, status").eq("id", waitlist_id).maybeSingle()
      : { data: null } as any;
    const { data: tRow } = entry
      ? await adminDb.from("tournaments").select("id, title, organization_id").eq("id", entry.tournament_id).maybeSingle()
      : { data: null } as any;
    if (!entry || !tRow) {
      return new Response(JSON.stringify({ error: "Waitlist entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: isAdminRole } = await adminDb.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    const { data: isMember } = await adminDb.rpc("is_org_member", { _user_id: caller.id, _org_id: tRow.organization_id });
    if (!isAdminRole && !isMember) {
      return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const email = String(entry.user_email || "").trim();
    const name = String(entry.user_name || "").trim() || "there";
    const tournament_title = String(tRow.title || "the event");
    const tournament_id = tRow.id;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const siteUrl = supabaseUrl.replace(".supabase.co", "").replace("https://", "https://");

    const claimUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/t/${tournament_id}?claim=${waitlist_id}`;
    const wl = await loadWhiteLabel(
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }),
      tournament_id,
    );

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a5c38, #2d8a5e); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 A Spot Opened Up!</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 16px;">Hi ${esc(name)},</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Great news! A spot has opened up for <strong>${esc(tournament_title)}</strong>.
          </p>
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400E; font-size: 14px; margin: 0; font-weight: 600;">
              ⏰ You have 24 hours to claim your spot
            </p>
            <p style="color: #92400E; font-size: 13px; margin: 8px 0 0 0;">
              After that, it will be offered to the next person on the waitlist.
            </p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${claimUrl}" style="display: inline-block; background: #c8a84e; color: #1a5c38; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
              Claim Your Spot →
            </a>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you can no longer attend, simply ignore this email and the spot will go to the next person.
          </p>
        </div>
        <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">
          Sent by TeeVents • Golf Tournament Management
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: brandSender("TeeVents Golf Management <info@notifications.teevents.golf>", wl),
        to: [email],
        bcc: ["info@teevents.golf"],
        subject: `🎉 A spot opened up for ${tournament_title}!`,
        html: brandEmailHtml(htmlBody, wl),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
