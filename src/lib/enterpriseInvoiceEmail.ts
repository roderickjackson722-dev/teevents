// Shared invoice email renderer: the server sends exactly what the Preview shows.
export function escapeInvoiceHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

export type InvoiceEmailInput = {
  invoice_number: string;
  organization_name: string | null | undefined;
  billing_name: string;
  billing_address: string;
  amount_cents: number;
  due_date: string;
};

export function formatInvoiceAmount(amountCents: number) {
  return `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInvoiceEmail(input: InvoiceEmailInput) {
  const amount = formatInvoiceAmount(input.amount_cents);
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222"><div style="border-bottom:3px solid #F5A623;padding-bottom:12px"><strong style="color:#1a5c38">TeeVents Golf Management</strong></div><h1 style="font-size:24px">Invoice ${escapeInvoiceHtml(input.invoice_number)}</h1><p><strong>${escapeInvoiceHtml(input.organization_name || "Enterprise account")}</strong></p><p>Bill to: ${escapeInvoiceHtml(input.billing_name)}<br>${escapeInvoiceHtml(input.billing_address).replace(/\n/g, "<br>")}</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:12px;border:1px solid #ddd">Amount due</td><td style="padding:12px;border:1px solid #ddd;text-align:right"><strong>${amount}</strong></td></tr><tr><td style="padding:12px;border:1px solid #ddd">Due date</td><td style="padding:12px;border:1px solid #ddd;text-align:right">${escapeInvoiceHtml(input.due_date)}</td></tr></table><p style="color:#666">Please contact the event organizer to arrange payment.</p></div>`;
  const subject = `Invoice ${input.invoice_number} from ${input.organization_name || "TeeVents"}`;
  return { subject, html };
}
