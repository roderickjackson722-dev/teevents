// Lead magnet follow-up email templates (pure string builders, no runtime deps).
const SITE = "https://www.teevents.golf";

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function confirmationEmailHtml(opts: { name: string; title: string; downloadUrl: string }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
    <div style="background:#1a5c38;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:20px;">Your ${esc(opts.title)}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p>Hi ${esc(opts.name)},</p>
      <p>Thank you for downloading the <strong>${esc(opts.title)}</strong>!</p>
      <p style="margin:24px 0;">
        <a href="${esc(opts.downloadUrl)}" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Download Your Copy</a>
      </p>
      <p>I hope you find this resource helpful as you plan your tournament.</p>
      <p>If you'd like to see what your tournament could look like on a professional platform, I'm offering a custom sample dashboard. No obligation &mdash; just a clear picture of what's possible.</p>
      <p style="margin:24px 0;">
        <a href="${SITE}/request-sample" style="display:inline-block;background:#1a5c38;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Request a Sample</a>
      </p>
      <p style="margin-top:24px;">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>
    </div>
  </div>`;
}

export function sampleOfferEmailHtml(opts: { name: string; title: string }) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#374151;">
    <div style="background:#1a5c38;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:20px;">See what your tournament could look like</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p>Hi ${esc(opts.name)},</p>
      <p>Just a quick follow-up on the <strong>${esc(opts.title)}</strong> you downloaded.</p>
      <p>If you're still planning your tournament, I can create a custom sample dashboard for your event. It will show you exactly what your tournament page, registration, and management tools could look like.</p>
      <p>No strings attached &mdash; just a way to see what's possible.</p>
      <p style="margin:24px 0;">
        <a href="${SITE}/request-sample" style="display:inline-block;background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Request a Sample</a>
      </p>
      <p style="margin-top:24px;">Best,<br/>Rod Jackson<br/>TeeVents Golf</p>
    </div>
  </div>`;
}
