// Shared builder for the "here's your sample event page" email so the admin
// preview in the Demo Converter renders exactly what the customer receives.

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface SampleShareEmailOptions {
  heading: string;
  message: string;
  link: string;
  buttonLabel?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

export function buildSampleShareEmailHtml(opts: SampleShareEmailOptions) {
  const primary = opts.primaryColor || "#1a5c38";
  const secondary = opts.secondaryColor || "#F5A623";
  const paragraphs = opts.message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;">${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
    <div style="background:${esc(primary)};color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
      ${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="" style="max-height:44px;margin-bottom:10px;display:block;" />` : ""}
      <h2 style="margin:0;font-size:20px;">${esc(opts.heading)}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      ${paragraphs}
      <p style="margin:24px 0;">
        <a href="${esc(opts.link)}" style="display:inline-block;background:${esc(secondary)};color:${esc(primary)};padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">
          ${esc(opts.buttonLabel || "View Your Sample Event Page")}
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280;word-break:break-all;">Or paste this link into your browser: ${esc(opts.link)}</p>
      <p style="margin-top:24px;font-size:13px;color:#6b7280;">TeeVents Golf Management • info@teevents.golf</p>
    </div>
  </div>`;
}

export function defaultSampleEmailMessage(opts: { customerName?: string | null; eventName: string }) {
  const name = opts.customerName?.trim() || "there";
  return `Hi ${name},

Here's the sample event page I built for ${opts.eventName}. It shows exactly how your registration, live leaderboard, and mobile scoring would look with your branding.

Take a look and let me know what you think. If you'd like, I can hop on a quick call and walk you through it.

— Roderick
TeeVents Golf Management`;
}
