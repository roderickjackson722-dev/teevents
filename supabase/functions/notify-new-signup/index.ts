import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAndLog } from "../_shared/emailLogger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANNING_LABELS: Record<string, string> = {
  scheduled: "Yes, we have a date scheduled",
  planning: "We are planning but don't have a date yet",
  browsing: "I'm just browsing / exploring",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const {
      email,
      full_name,
      phone,
      planning_status,
      roles,
      role_other,
      heard_from,
      heard_from_other,
      vetting_status,
      tournament_name,
      expected_players,
    } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const status = vetting_status || "approved";
    const isApproved = status === "approved";

    const planningLabel = planning_status ? (PLANNING_LABELS[planning_status] || planning_status) : "—";
    const rolesList = Array.isArray(roles) && roles.length
      ? roles.join(", ") + (role_other ? ` (Other: ${role_other})` : "")
      : (role_other ? `Other: ${role_other}` : "—");
    const heardFromLabel = heard_from
      ? (heard_from === "other" && heard_from_other ? `Other: ${heard_from_other}` : heard_from)
      : "—";

    const subject = isApproved
      ? `🆕 New User Signup – ${full_name || email} – Approved`
      : `🟡 New Demo Request – ${full_name || email} – ${planningLabel}`;

    const accessBlock = isApproved
      ? `<p style="margin:0 0 6px 0;">→ User has full platform access.</p>
         <p style="margin:0;">→ Dashboard: <a href="https://www.teevents.golf/dashboard">https://www.teevents.golf/dashboard</a></p>`
      : `<p style="margin:0 0 6px 0;">→ User was directed to the demo request page.</p>
         <p style="margin:0;">→ Demo request recorded in Admin → Sales Outreach → Demo Requests.</p>`;

    const actionBlock = isApproved
      ? `<p style="margin:0;color:#16a34a;">No action needed – user has access.</p>`
      : `<p style="margin:0 0 6px 0;color:#b45309;font-weight:bold;">Follow up to schedule a demo.</p>
         <p style="margin:0;">Manage in: Admin → Sales Outreach → Demo Requests</p>`;

    const tournamentInfo = (!isApproved && (tournament_name || expected_players))
      ? `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Tournament Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${tournament_name || "—"}</td></tr>
         <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Expected Players</td><td style="padding:8px;border:1px solid #e5e7eb;">${expected_players || "—"}</td></tr>`
      : "";

    // Organization, event, plan and Organizer Toolbox summary (when available)
    let orgName = "Not created yet", eventName = "Not created yet", planLabel = "$0 to Start", toolboxLink = "https://www.teevents.golf/admin/organizer-toolboxes";
    let tb: any = null;
    try {
      const { data: vet } = await supabaseAdmin.from("signup_vetting").select("user_id, organization_name").ilike("email", String(email || "")).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (vet?.organization_name) orgName = vet.organization_name;
      if (vet?.user_id) {
        const { data: mem } = await supabaseAdmin.from("org_members").select("organization_id").eq("user_id", vet.user_id).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (mem?.organization_id) {
          const [{ data: org }, { data: ev }, { data: box }] = await Promise.all([
            supabaseAdmin.from("organizations").select("name, plan, pricing_model").eq("id", mem.organization_id).maybeSingle(),
            supabaseAdmin.from("tournaments").select("title").eq("organization_id", mem.organization_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabaseAdmin.from("organizer_toolboxes").select("*").eq("organization_id", mem.organization_id).maybeSingle(),
          ]);
          if (org?.name) orgName = org.name;
          if (ev?.title) eventName = ev.title;
          const pm = String(org?.pricing_model || org?.plan || "");
          planLabel = /enterprise/i.test(pm) ? "Enterprise" : /league/i.test(pm) ? "$499 Per-League" : /event|pro/i.test(pm) ? "$299 Per-Event" : "$0 to Start";
          tb = box;
          toolboxLink = `https://www.teevents.golf/admin/organizer-toolboxes?org=${mem.organization_id}`;
        }
      }
    } catch (_) { /* summary is best effort */ }
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
    const colorsSet = !!(tb?.brand_colors && (tb.brand_colors.primary || tb.brand_colors.secondary || tb.brand_colors.accent));
    const summary = `Logo uploaded: ${tb?.logo ? "Yes" : "No"} / Colors set: ${colorsSet ? "Yes" : "No"} / Hero image: ${tb?.hero_image ? "Yes" : "No"} / Sponsor logos: ${tb?.sponsor_logos?.length || 0} / Documents: ${tb?.documents?.length || 0} / Notes: ${(tb?.additional_notes || tb?.anything_else) ? "Provided" : "Not yet"}`;
    const toolboxBlock = isApproved ? `
        <h3 style="color:#1a5c38;border-bottom:2px solid #1a5c38;padding-bottom:4px;">Organizer Toolbox</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 12px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:35%;">Organization</td><td style="padding:8px;border:1px solid #e5e7eb;">${esc(orgName)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Event</td><td style="padding:8px;border:1px solid #e5e7eb;">${esc(eventName)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Plan Selected</td><td style="padding:8px;border:1px solid #e5e7eb;">${esc(planLabel)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Uploaded Items</td><td style="padding:8px;border:1px solid #e5e7eb;">${summary}</td></tr>
        </table>
        <p style="margin:0 0 20px 0;"><a href="${toolboxLink}" style="display:inline-block;background:#d4a843;color:#1a3a2a;font-weight:bold;padding:10px 18px;border-radius:6px;text-decoration:none;">View their Organizer Toolbox</a></p>` : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color:#111827;">
        <h2 style="color:#1a5c38;margin:0 0 4px 0;">${isApproved ? "New TeeVents Signup" : "New Demo Request"}</h2>
        <p style="color:#6b7280;margin:0 0 20px 0;">${isApproved ? "Vetting passed – account active." : "User did not qualify for instant access."}</p>

        <h3 style="color:#1a5c38;border-bottom:2px solid #1a5c38;padding-bottom:4px;">User Information</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 20px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:35%;">Name</td><td style="padding:8px;border:1px solid #e5e7eb;">${full_name || "—"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Phone</td><td style="padding:8px;border:1px solid #e5e7eb;">${phone || "—"}</td></tr>
          ${tournamentInfo}
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">Created</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date().toLocaleString("en-US")}</td></tr>
        </table>

        ${toolboxBlock}
        <h3 style="color:#1a5c38;border-bottom:2px solid #1a5c38;padding-bottom:4px;">Vetting Responses</h3>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 20px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;width:45%;">1. Tournament currently planned?</td><td style="padding:8px;border:1px solid #e5e7eb;">${planningLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">2. Role</td><td style="padding:8px;border:1px solid #e5e7eb;">${rolesList}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;background:#f9fafb;">3. How they heard about us</td><td style="padding:8px;border:1px solid #e5e7eb;">${heardFromLabel}</td></tr>
        </table>

        <h3 style="color:#1a5c38;border-bottom:2px solid #1a5c38;padding-bottom:4px;">Access Granted</h3>
        <div style="padding:12px;background:${isApproved ? "#ecfdf5" : "#fef3c7"};border-radius:6px;margin:8px 0 20px 0;">
          <p style="margin:0 0 6px 0;font-weight:bold;">Vetting Status: ${isApproved ? "Approved" : "Demo Requested"}</p>
          ${accessBlock}
        </div>

        <h3 style="color:#1a5c38;border-bottom:2px solid #1a5c38;padding-bottom:4px;">Action Required</h3>
        <div style="padding:12px;background:#f9fafb;border-radius:6px;margin:8px 0 20px 0;">
          ${actionBlock}
        </div>

        <p style="color:#6b7280;font-size:12px;margin-top:24px;">View admin dashboard: <a href="https://www.teevents.golf/admin">https://www.teevents.golf/admin</a></p>
      </div>`;

    const result = await sendAndLog(
      supabaseAdmin,
      RESEND_API_KEY,
      {
        from: "TeeVents Golf Management <info@notifications.teevents.golf>",
        to: ["info@teevents.golf"],
        subject,
        html,
      },
      {
        templateName: isApproved ? "admin-new-signup-notification" : "admin-demo-request-notification",
        source: "notify-new-signup",
        metadata: { signup_email: email, full_name, phone, vetting_status: status, planning_status },
      },
    );

    return new Response(JSON.stringify({ success: result.ok, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.ok ? 200 : 500,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
