/** Organizer emails for the custom domain renewal lifecycle (pure HTML builders). */
const SITE = "https://www.teevents.golf";

function esc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const p = (html: string) => `<p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.7;">${html}</p>`;
const btn = (href: string, label: string) =>
  `<a href="${esc(href)}" style="background:#F5A623;color:#1a5c38;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;margin:4px 8px 4px 0;font-size:14px;">${esc(label)}</a>`;

function shell(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
<tr><td style="background:#1a5c38;padding:26px 32px;text-align:center;"><h1 style="margin:0;color:#ffffff;font-size:21px;">${esc(title)}</h1></td></tr>
<tr><td style="padding:26px 32px;">${body}
<p style="margin:18px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">Best regards,<br />Rod Jackson<br />TeeVents Golf Management<br />info@teevents.golf</p></td></tr>
<tr><td style="background:#1a5c38;padding:16px;text-align:center;"><a href="${SITE}" style="color:#F5A623;text-decoration:none;font-size:12px;">teevents.golf</a></td></tr>
</table></td></tr></table></body></html>`;
}

export type DomainEmailInput = {
  organizerName: string;
  tournamentName: string;
  domain: string;
  slug: string;
  tournamentId: string;
};

export function renewalLink(tournamentId: string) {
  return `${SITE}/dashboard/tournaments/${encodeURIComponent(tournamentId)}/site?renew_domain=1`;
}

export function buildDomainRenewalNotice(o: DomainEmailInput) {
  const subject = `Keep your web address active for ${o.tournamentName}`;
  const html = shell(
    "Keep Your Tournament Web Address",
    p(`Hi ${esc(o.organizerName) || "Organizer"},`) +
      p("Congratulations again on a fantastic tournament!") +
      p(`Your custom web address (<strong>${esc(o.domain)}</strong>) is still serving your golfers, sponsors and committee as they view final results.`) +
      p(`As you plan next season, your web address for <strong>${esc(o.tournamentName)}</strong> is ready to renew. In 30 days it will start sending visitors to your TeeVents event page instead.`) +
      `<ul style="margin:0 0 14px;padding-left:20px;color:#374151;font-size:15px;line-height:1.7;">
<li><strong>One memorable link</strong> for sponsors and committee planning.</li>
<li><strong>Open next year's registration early</strong> without changing printed flyers.</li>
<li><strong>Keep sponsors visible online</strong> year-round.</li></ul>` +
      p("Renew your custom web address for $99 to keep it live with full security for another 12 months.") +
      `<div>${btn(renewalLink(o.tournamentId), "Renew Web Address ($99)")}${btn(`${SITE}/dashboard/tournaments`, "Plan Our Next Tournament")}</div>` +
      p("Questions or ready to talk about next year's date? Just reply to this email."),
  );
  return { subject, html };
}

export function buildDomainArchivedNotice(o: DomainEmailInput) {
  const subject = `${o.domain} now opens your TeeVents event page`;
  const archive = `${SITE}/t/${encodeURIComponent(o.slug)}`;
  const html = shell(
    "Your Web Address Has Moved to Your Event Archive",
    p(`Hi ${esc(o.organizerName) || "Organizer"},`) +
      p(`Your tournament web address (<strong>${esc(o.domain)}</strong>) has finished its 60-day post-event window. Visitors now go to your permanent TeeVents event page:`) +
      p(`<a href="${esc(archive)}" style="color:#1a5c38;">${esc(archive)}</a>`) +
      `<ul style="margin:0 0 14px;padding-left:20px;color:#374151;font-size:15px;line-height:1.7;">
<li>Anyone using your link still lands on your official results.</li>
<li>No links are broken and golfers never see an error.</li></ul>` +
      p(`Running <strong>${esc(o.tournamentName)}</strong> again? Renew any time to bring your own web address back.`) +
      `<div>${btn(renewalLink(o.tournamentId), "Reactivate Web Address ($99)")}</div>` +
      p("Thank you for being part of TeeVents. We look forward to powering your next event!"),
  );
  return { subject, html };
}
