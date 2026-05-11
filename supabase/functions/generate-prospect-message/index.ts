import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CALENDLY = "https://calendly.com/teevents/teevents-demo";
const SIGNOFF = "To a smoother tournament,\n\nTom\nTeeVents Golf";

function eventbriteTemplate(organizer: string, tournament: string, calendly: string) {
  return `Hi ${organizer},

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
https://www.teevents.golf/compare/eventbrite-vs-teevents

I'd be happy to show you how it works in a quick 15-min demo.
${calendly}

${SIGNOFF}`;
}

function manualTemplate(organizer: string, tournament: string, calendly: string) {
  return `Hi ${organizer},

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

${SIGNOFF}`;
}

function shortFacebookTemplate(organizer: string, tournament: string, calendly: string) {
  return `Hi ${organizer},

Saw your post about ${tournament} — looks like a fun event.

If you're handling registrations and payments manually, TeeVents can save you hours: a pro tournament site (live in 10 min), online registration with Stripe/Apple Pay, live leaderboard, pairings, and automatic payouts. Free to start.

Happy to show you in a quick 15-min demo:
${calendly}

${SIGNOFF}`;
}

function followupTemplate(organizer: string, tournament: string, calendly: string) {
  return `Hi ${organizer},

Just circling back on ${tournament}. I know this time of year is hectic — no pressure at all.

If it would help, I'm happy to walk you through how TeeVents handles registration, scoring, and payouts in 15 minutes:
${calendly}

Either way, wishing you a great event.

${SIGNOFF}`;
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

    let message = "";
    if (kind === "followup") {
      message = followupTemplate(organizer_name, tournament_name, calendly);
    } else if (detected_setup === "eventbrite") {
      message = eventbriteTemplate(organizer_name, tournament_name, calendly);
    } else if (detected_setup === "manual") {
      message = manualTemplate(organizer_name, tournament_name, calendly);
    } else if (detected_setup === "facebook") {
      message = shortFacebookTemplate(organizer_name, tournament_name, calendly);
    } else {
      message = manualTemplate(organizer_name, tournament_name, calendly);
    }

    return new Response(JSON.stringify({ message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
