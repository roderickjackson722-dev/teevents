import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FROM = "TeeVents Golf Management <info@notifications.teevents.golf>";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

async function requireOrgMember(supabase: any, userId: string, organizationId: string) {
  const { data: member } = await supabase.from("org_members").select("role, permissions").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (!member) throw new Error("Organization access is required");
  return member;
}

async function sendEmail(key: string, to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
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
    const member = await requireOrgMember(context.supabase, context.userId, data.organizationId);
    if (!["owner", "admin"].includes(member.role) && !member.permissions?.includes("manage_messages")) throw new Error("Messaging permission is required");
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
      const response = await sendEmail(key, to, data.subject, html);
      if (response.ok) sent += 1; else failed += 1;
    }
    await supabaseAdmin.from("enterprise_communication_log").insert({ organization_id: data.organizationId, subject: data.subject, recipient_count: emails.length, sent_count: sent, failed_count: failed, sent_by: context.userId });
    return { recipients: emails.length, sent, failed };
  });

export const emailEnterpriseInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; invoiceId: string }) => {
    if (!input?.organizationId || !input?.invoiceId) throw new Error("Invoice is required");
    return input;
  })
  .handler(async ({ data, context }: any) => {
    const member = await requireOrgMember(context.supabase, context.userId, data.organizationId);
    if (!["owner", "admin"].includes(member.role)) throw new Error("Owner or admin access is required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: invoice }, { data: organization }] = await Promise.all([
      supabaseAdmin.from("enterprise_invoices").select("*").eq("id", data.invoiceId).eq("organization_id", data.organizationId).maybeSingle(),
      supabaseAdmin.from("organizations").select("name").eq("id", data.organizationId).maybeSingle(),
    ]);
    if (!invoice || !EMAIL.test(invoice.billing_email)) throw new Error("Invoice or billing email was not found");
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("Email service is not configured");
    const amount = `$${(invoice.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222"><div style="border-bottom:3px solid #F5A623;padding-bottom:12px"><strong style="color:#1a5c38">TeeVents Golf Management</strong></div><h1 style="font-size:24px">Invoice ${escapeHtml(invoice.invoice_number)}</h1><p><strong>${escapeHtml(organization?.name || "Enterprise account")}</strong></p><p>Bill to: ${escapeHtml(invoice.billing_name)}<br>${escapeHtml(invoice.billing_address).replace(/\n/g, "<br>")}</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:12px;border:1px solid #ddd">Amount due</td><td style="padding:12px;border:1px solid #ddd;text-align:right"><strong>${amount}</strong></td></tr><tr><td style="padding:12px;border:1px solid #ddd">Due date</td><td style="padding:12px;border:1px solid #ddd;text-align:right">${escapeHtml(invoice.due_date)}</td></tr></table><p style="color:#666">Please contact the event organizer to arrange payment.</p></div>`;
    const response = await sendEmail(key, invoice.billing_email, `Invoice ${invoice.invoice_number} from ${organization?.name || "TeeVents"}`, html);
    if (!response.ok) throw new Error("Invoice email could not be sent");
    await supabaseAdmin.from("enterprise_invoice_audit_log").insert({ invoice_id: invoice.id, organization_id: data.organizationId, actor_id: context.userId, action: "emailed", details: { recipient: invoice.billing_email } });
    return { sent: true as const };
  });