import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FROM = "TeeVents Golf Management <info@notifications.teevents.golf>";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

async function requireOrgMember(supabase: any, userId: string, organizationId: string) {
  const { data: member } = await supabase.from("org_members").select("role").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (!member) throw new Error("Organization access is required");
  return member;
}

export const sendEnterpriseRosterEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; subject: string; message: string }) => {
    const subject = String(input?.subject || "").trim().slice(0, 160);
    const message = String(input?.message || "").trim().slice(0, 10000);
    if (!input?.organizationId || !subject || !message) throw new Error("Subject and message are required");
    return { organizationId: input.organizationId, subject, message };
  })
  .handler(async ({ data, context }: any) => {
    await requireOrgMember(context.supabase, context.userId, data.organizationId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roster } = await supabaseAdmin.from("enterprise_roster").select("email").eq("organization_id", data.organizationId).eq("is_active", true);
    const emails = [...new Set((roster || []).map((row: any) => String(row.email || "").trim().toLowerCase()).filter((email: string) => EMAIL.test(email)))];
    if (!emails.length) throw new Error("No valid roster email addresses were found");
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("Email service is not configured");
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222"><div style="border-bottom:3px solid #F5A623;padding-bottom:12px"><strong style="color:#1a5c38">TeeVents Golf Management</strong></div><div style="white-space:pre-wrap;line-height:1.6;padding:20px 0">${escapeHtml(data.message)}</div></div>`;
    let sent = 0;
    let failed = 0;
    for (const to of emails) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM, to: [to], subject: data.subject, html }) });
      if (response.ok) sent += 1; else failed += 1;
    }
    await supabaseAdmin.from("enterprise_communication_log").insert({ organization_id: data.organizationId, subject: data.subject, recipient_count: emails.length, sent_count: sent, failed_count: failed, sent_by: context.userId });
    return { recipients: emails.length, sent, failed };
  });