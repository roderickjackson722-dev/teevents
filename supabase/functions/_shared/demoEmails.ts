// Shared HTML helper for TeeVents demo nurture emails.
const FROM = "TeeVents <notifications@notifications.teevents.golf>";

export function demoEmailFrom() {
  return FROM;
}

function wrap(content: string, ctaUrl: string, ctaLabel: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
    <div style="border-bottom: 4px solid #1a5c38; padding-bottom: 12px; margin-bottom: 20px;">
      <h1 style="color: #1a5c38; margin: 0; font-size: 22px;">TeeVents</h1>
    </div>
    ${content}
    <div style="text-align:center; margin: 28px 0;">
      <a href="${ctaUrl}" style="background:#F5A623;color:#1a5c38;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">${ctaLabel}</a>
    </div>
    <p style="color:#6b7280;font-size:12px;margin-top:32px;text-align:center;">
      TeeVents · Run unforgettable golf tournaments<br/>
      <a href="https://teevents.golf" style="color:#6b7280;">teevents.golf</a>
    </p>
  </div>`;
}

export function welcomeEmail(): { subject: string; html: string } {
  return {
    subject: "Your TeeVents demo recap — pick up where you left off",
    html: wrap(
      `<h2 style="color:#1a5c38;">Thanks for trying TeeVents!</h2>
      <p>You just walked through the same dashboard our organizers use to run real tournaments. A quick recap:</p>
      <ul style="line-height:1.7;">
        <li><strong>One place</strong> for registrations, payments, scoring, and sponsors.</li>
        <li><strong>5% platform fee</strong> + standard Stripe processing — no monthly cost on the Base plan.</li>
        <li><strong>Stripe Connect</strong> sends net proceeds straight to your bank — TeeVents never holds your money.</li>
        <li><strong>Pro</strong> ($399 per tournament) unlocks live leaderboards, sponsor portal, and auctions.</li>
      </ul>
      <p>Click below to come back to the demo any time, or jump straight to creating your first tournament.</p>`,
      "https://teevents.golf/interactive-demo",
      "Re-open the demo →",
    ),
  };
}

export function followup24hEmail(): { subject: string; html: string } {
  return {
    subject: "Have a question about TeeVents?",
    html: wrap(
      `<h2 style="color:#1a5c38;">Still thinking it over?</h2>
      <p>Yesterday you took our interactive product tour. We'd love to help you get started.</p>
      <p>Most organizers have one of these questions before signing up:</p>
      <ul style="line-height:1.7;">
        <li><strong>"How do I get paid?"</strong> — Connect Stripe in 2–3 minutes; payouts are automatic.</li>
        <li><strong>"What does it cost?"</strong> — $0 to start. 5% platform fee on paid registrations only.</li>
        <li><strong>"Can players score live?"</strong> — Yes, via QR code. No app to install.</li>
      </ul>
      <p>Reply to this email with any question — a real human will answer.</p>`,
      "https://teevents.golf/login",
      "Create my tournament →",
    ),
  };
}

export function followup7dEmail(leadId: string): { subject: string; html: string } {
  const fb = `https://teevents.golf/interactive-demo?lead=${leadId}&feedback=1`;
  return {
    subject: "What kept you from signing up?",
    html: wrap(
      `<h2 style="color:#1a5c38;">A quick favor?</h2>
      <p>You explored TeeVents a week ago but haven't created a tournament yet. We'd love to know why — it takes 30 seconds and helps us improve.</p>
      <p style="text-align:center;"><a href="${fb}" style="color:#1a5c38;font-weight:bold;">Share quick feedback →</a></p>
      <p>Or if you're ready, jump back in below.</p>`,
      "https://teevents.golf/login",
      "Sign up free →",
    ),
  };
}
