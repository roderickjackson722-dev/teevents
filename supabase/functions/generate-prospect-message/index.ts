import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DEFAULT_CALENDLY = "https://calendly.com/teevents/teevents-demo";
const WEBSITE_URL = "https://www.teevents.golf";
const WEBSITE_LABEL = "TeeVents.golf";
const COMPARE_URL = "https://www.teevents.golf/compare/eventbrite-vs-teevents";
const SIGNOFF_TEXT = `To a smoother tournament,\n\nRod\nTeeVents Golf`;
const SIGNOFF_HTML = `To a smoother tournament,<br><br>Rod<br><a href="${WEBSITE_URL}">TeeVents Golf</a>`;

type Out = { text: string; html: string };

const link = (label: string, url: string) => `<a href="${url}">${label}</a>`;
const para = (s: string) => s.split("\n").map(l => l.trim()).filter(Boolean).map(l => `<p>${l}</p>`).join("");

function eventbriteTemplate(organizer: string, tournament: string, calendly: string): Out {
  const text = `Hi ${organizer},

I saw your event ${tournament} on Eventbrite.

Eventbrite is great for concerts, but it wasn't built for golf tournaments. You're missing:

· Live leaderboards
· Hole sponsors
· Volunteer check-in
· Pairings & tee sheets

And two big frustrations you've probably felt:

1. Juggling spreadsheets for things Eventbrite doesn't handle.
2. Waiting for funds — Eventbrite holds your money until after the event.

TeeVents was built specifically for golf:

· Live leaderboard (embed on your site)
· Sponsor portal with asset delivery
· Volunteer QR check-in & shift scheduling
· Drag-and-drop pairings
· Bi-weekly or on-demand payouts — no waiting

Why bi-weekly payouts matter:
Courses often require deposits. Signage, printing, and food need to be paid before the event. With TeeVents, you can use the registration funds you've already collected to cover these costs — instead of paying out of your own pocket and waiting weeks for Eventbrite to release your money.

Plus, our pricing is simple: $5 flat fee per registration (not a percentage).

See the full comparison here:
${COMPARE_URL}

I'd be happy to show you how it works in a quick 15-min demo.
${calendly}

${SIGNOFF_TEXT}`;

  const html = `<p>Hi ${organizer},</p>
<p>I saw your event <strong>${tournament}</strong> on Eventbrite.</p>
<p>Eventbrite is great for concerts, but it wasn't built for golf tournaments. You're missing:</p>
<ul><li>Live leaderboards</li><li>Hole sponsors</li><li>Volunteer check-in</li><li>Pairings &amp; tee sheets</li></ul>
<p>And two big frustrations you've probably felt:</p>
<ol><li>Juggling spreadsheets for things Eventbrite doesn't handle.</li><li>Waiting for funds — Eventbrite holds your money until after the event.</li></ol>
<p>${link(WEBSITE_LABEL, WEBSITE_URL)} was built specifically for golf:</p>
<ul><li>Live leaderboard (embed on your site)</li><li>Sponsor portal with asset delivery</li><li>Volunteer QR check-in &amp; shift scheduling</li><li>Drag-and-drop pairings</li><li>Bi-weekly or on-demand payouts — no waiting</li></ul>
<p><strong>Why bi-weekly payouts matter:</strong> Courses often require deposits. Signage, printing, and food need to be paid before the event. With TeeVents, you can use the registration funds you've already collected to cover these costs — instead of paying out of your own pocket and waiting weeks for Eventbrite to release your money.</p>
<p>Plus, our pricing is simple: <strong>$5 flat fee per registration</strong> (not a percentage).</p>
<p>See the full comparison: ${link("Eventbrite vs TeeVents", COMPARE_URL)}</p>
<p>I'd be happy to show you how it works in a quick 15-min demo.<br>${link("Book a 15-min demo", calendly)}</p>
<p>${SIGNOFF_HTML}</p>`;
  return { text, html };
}

function manualTemplate(organizer: string, tournament: string, calendly: string): Out {
  const text = `Hi ${organizer},

I saw your event ${tournament} — looks like a great tournament.

Quick question: are you handling registrations and payments manually?

I ask because most organizers in your position are juggling spreadsheets, chasing payments, and spending hours on backend work that could be automated.

TeeVents gives you:

· A professional tournament website (live in 10 minutes)
· Online registration with Stripe, Apple Pay, Google Pay
· Live leaderboard & scoring
· Pairings & tee sheets
· Volunteer check-in
· Automatic payouts (bi-weekly or on-demand)

No more spreadsheets. No more chasing payments. And it's free to start.

I'd be happy to show you how it works in a quick 15-min demo.
${calendly}

${SIGNOFF_TEXT}`;

  const html = `<p>Hi ${organizer},</p>
<p>I saw your event <strong>${tournament}</strong> — looks like a great tournament.</p>
<p>Quick question: are you handling registrations and payments manually?</p>
<p>I ask because most organizers in your position are juggling spreadsheets, chasing payments, and spending hours on backend work that could be automated.</p>
<p>${link(WEBSITE_LABEL, WEBSITE_URL)} gives you:</p>
<ul><li>A professional tournament website (live in 10 minutes)</li><li>Online registration with Stripe, Apple Pay, Google Pay</li><li>Live leaderboard &amp; scoring</li><li>Pairings &amp; tee sheets</li><li>Volunteer check-in</li><li>Automatic payouts (bi-weekly or on-demand)</li></ul>
<p>No more spreadsheets. No more chasing payments. And it's free to start.</p>
<p>I'd be happy to show you how it works in a quick 15-min demo.<br>${link("Book a 15-min demo", calendly)}</p>
<p>${SIGNOFF_HTML}</p>`;
  return { text, html };
}

function shortFacebookTemplate(organizer: string, tournament: string, calendly: string): Out {
  const text = `Hi ${organizer},

Saw your post about ${tournament} — looks like a fun event.

If you're handling registrations and payments manually, TeeVents can save you hours: a pro tournament site (live in 10 min), online registration with Stripe/Apple Pay, live leaderboard, pairings, and automatic payouts. Free to start.

Happy to show you in a quick 15-min demo:
${calendly}

${SIGNOFF_TEXT}`;

  const html = `<p>Hi ${organizer},</p>
<p>Saw your post about <strong>${tournament}</strong> — looks like a fun event.</p>
<p>If you're handling registrations and payments manually, ${link(WEBSITE_LABEL, WEBSITE_URL)} can save you hours: a pro tournament site (live in 10 min), online registration with Stripe/Apple Pay, live leaderboard, pairings, and automatic payouts. Free to start.</p>
<p>Happy to show you in a quick 15-min demo: ${link("Book a demo", calendly)}</p>
<p>${SIGNOFF_HTML}</p>`;
  return { text, html };
}

function followupTemplate(organizer: string, tournament: string, calendly: string): Out {
  const text = `Hi ${organizer},

Just circling back on ${tournament}. I know this time of year is hectic — no pressure at all.

If it would help, I'm happy to walk you through how TeeVents handles registration, scoring, and payouts in 15 minutes:
${calendly}

Either way, wishing you a great event.

${SIGNOFF_TEXT}`;

  const html = `<p>Hi ${organizer},</p>
<p>Just circling back on <strong>${tournament}</strong>. I know this time of year is hectic — no pressure at all.</p>
<p>If it would help, I'm happy to walk you through how ${link(WEBSITE_LABEL, WEBSITE_URL)} handles registration, scoring, and payouts in 15 minutes: ${link("Pick a time", calendly)}</p>
<p>Either way, wishing you a great event.</p>
<p>${SIGNOFF_HTML}</p>`;
  return { text, html };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const tournament_name = (body.tournament_name || "your event").toString();
    const organizer_name = (body.organizer_name && String(body.organizer_name).trim()) || "there";
    const detected_setup = (body.detected_setup || "").toString().toLowerCase();
    const kind = (body.kind || "").toString().toLowerCase();
    const calendly = (body.calendly_link && String(body.calendly_link).trim()) || DEFAULT_CALENDLY;

    let out: Out;
    if (kind === "followup") out = followupTemplate(organizer_name, tournament_name, calendly);
    else if (detected_setup === "eventbrite") out = eventbriteTemplate(organizer_name, tournament_name, calendly);
    else if (detected_setup === "manual") out = manualTemplate(organizer_name, tournament_name, calendly);
    else if (detected_setup === "facebook") out = shortFacebookTemplate(organizer_name, tournament_name, calendly);
    else out = manualTemplate(organizer_name, tournament_name, calendly);

    return new Response(JSON.stringify({ message: out.text, message_html: out.html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
