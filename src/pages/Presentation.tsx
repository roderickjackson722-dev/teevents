import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const emailHref = "mailto:info@teevents.golf?subject=TeeVents%20presentation%20follow%20up";

const offers = [
  { title: "Branded event page", text: "One branded page for your whole event, built for you or built by you with the same tools, with full control either way." },
  { title: "Registration and sponsorships", text: "Online registration, plus sponsor tiers that sponsors can pay for on the same page." },
  { title: "Pairings", text: "Drag and drop pairings, plus an alpha list, cart signs, and scorecards for event day." },
  { title: "QR check in", text: "Fast check in on event day, with golfer scoring codes." },
  { title: "Live scoring and leaderboard", text: "Live scoring during play, with a live leaderboard players and sponsors can follow." },
  { title: "Sponsor and auction tools", text: "Sponsor visibility and auction tools to help raise more for your cause." },
  { title: "Live budget tracking", text: "See registrations, sponsorships, and money coming in, in one place." },
  { title: "Done for you setup", text: "We build your event page for you, live in 7 days or less, once you send your logo and tournament details. Every plan includes a dedicated rep." },
  { title: "On site tournament day help", text: "In person tournament management on event day, from check in to live scoring, available as a separate service. Travel is quoted separately." },
];

const steps = [
  "We build your branded page, live in 7 days or less once logo and details arrive.",
  "You share one link. Golfers register, sponsors pay, and money goes straight to your own Stripe account.",
  "We help with pairings, check in, live scoring, and event day, so the day runs smoothly.",
];

const addons = [
  "Live Leaderboard and Mobile Scoring, on No Cost to Start only, included on Per Event and up",
  "Unlimited Manual Entries",
  "Auction Dashboard",
  "Branding Removal and Digital Sponsor",
  "Custom Domain",
];

export default function Presentation() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl space-y-5 px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">TeeVents</h1>
        <p className="text-xl font-medium md:text-2xl">A golf tournament and event management platform.</p>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/85 [overflow-wrap:normal]">
          One branded page for the whole event, from registration and sponsorships to pairings, live scoring, and check in.
        </p>
      </div>
    </section>

    <article className="container mx-auto max-w-3xl space-y-12 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Why a golf platform, not a generic registration tool</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Generic tools give you a page to register and pay. They do not build pairings, an alpha list, cart signs, scorecards, or a live golf leaderboard, and they do not help on tournament day. TeeVents was built by people who run golf tournaments, for the organizer side and for what a golf course needs on event day.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/40 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Generic registration tools</p>
            <p className="mt-2 leading-relaxed text-foreground/85 [overflow-wrap:normal]">
              Registration and payment only, payout often after the event, no golf pairings, no live leaderboard, no tournament day help.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">TeeVents</p>
            <p className="mt-2 leading-relaxed text-foreground/85 [overflow-wrap:normal]">
              Registration and payment, plus pairings, check in, live scoring, sponsor tools, and tournament day help, all in one place.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">What TeeVents offers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map(item => <div key={item.title} className="rounded-lg border border-border bg-muted/40 p-5">
            <p className="text-lg font-semibold text-foreground">{item.title}</p>
            <p className="mt-2 leading-relaxed text-foreground/85 [overflow-wrap:normal]">{item.text}</p>
          </div>)}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">How it works, in 3 steps</h2>
        <ol className="space-y-5">
          {steps.map((text, index) => <li key={text} className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Step {index + 1}</p>
            <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">{text}</p>
          </li>)}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">How money works</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Organizers connect their own Stripe account, so funds go directly to them. TeeVents never holds your money.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Stripe processing, at 2.9 percent plus $0.30, is separate, and applies in all cases.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          TeeVents does not issue refunds directly to golfers. Refunds to golfers are at the organizer discretion, and are issued by the organizer.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Pricing, and who each package is good for</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-5 space-y-2">
            <p className="text-lg font-semibold text-foreground">No Cost to Start</p>
            <p className="text-lg font-bold text-foreground">$0 to start</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">5 percent platform fee, paid by players at checkout. Includes 10 manual entries, a dedicated rep, and an event page built for you, live in 7 days or less.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Good for:</span> Nonprofits, schools, PTA boards, and first time organizers who do not have a budget to vote on yet, and who want to start with no money up front.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">Live Leaderboard and Mobile Scoring is available as a $99 add on on this plan.</p>
          </div>

          <div className="rounded-lg border-2 border-secondary bg-muted/40 p-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground">Per Event</p>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary-foreground">Most Popular</span>
            </div>
            <p className="text-lg font-bold text-foreground">$399 per event</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">0 percent TeeVents platform fee. Live Leaderboard and Mobile Scoring included. Unlimited manual entries.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Good for:</span> Organizers running one event who want golfers to pay exactly the entry fee, with no platform fee at checkout, and who want live scoring included.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Example only:</span> At $7,980 in registrations, players collectively pay $399 in fees on No Cost to Start. Above that amount, $399 flat saves players money at checkout.</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-5 space-y-2">
            <p className="text-lg font-semibold text-foreground">Per League</p>
            <p className="text-lg font-bold text-foreground">$599 per league</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">For organizers running a league, with the same core platform tools for league play.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Good for:</span> Leagues that need one platform for the season, not just one event.</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-5 space-y-2">
            <p className="text-lg font-semibold text-foreground">Enterprise</p>
            <p className="text-lg font-bold text-foreground">$2,999 per year, for 10 or more events</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">Annual plan for golf courses that want to run their whole calendar in one place, with a dedicated rep.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Good for:</span> Golf courses running 10 or more events a year, who want one system for the whole calendar, instead of a different tool for each event.</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-5 space-y-2">
            <p className="text-lg font-semibold text-foreground">Hybrid Managed</p>
            <p className="text-lg font-bold text-foreground">Starting at $5,000 per event, plus travel quoted separately</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">Platform stays No Cost to Start. Management is paid from event proceeds, with $0 due at signing. $1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents, and the remaining $3,125 is due 7 days before event day. Only collections through TeeVents count toward the $3,750 trigger. The organizer is liable for the full $5,000, even if proceeds are low.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">Includes course negotiation and communication, food, awards, and vendor recommendations and negotiations, sponsor packets and tiers, pairings, check in, live scoring, timeline and consulting throughout, and on site event day coordination. The group recruits players, sells sponsorships, and pays course, food, awards, and vendor costs directly. TeeVents does not pay for those costs, and does not guarantee a player count, sponsorship dollars, or profit.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]"><span className="font-semibold text-foreground">Good for:</span> PTA boards, schools, nonprofits, and similar groups that need a full tournament manager, but do not have money up front, for events planned months in advance, with a minimum field of 50 players.</p>
            <p className="leading-relaxed text-foreground/85 [overflow-wrap:normal]">If the event cancels, a work fee applies for work already done: $1,500 after course negotiation and platform build, $3,000 after registration launch and sponsor packet, and the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Add ons, $99 each, one time per event</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          {addons.map(item => <li key={item}>{item}</li>)}
        </ul>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Page build out is included in done for you setup, not a separate add on.
        </p>
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Next step</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          A 15 minute demo, with no prep needed, and no obligation to buy.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          We will show how TeeVents works, the event page and the back end. You tell us what would work for your tournament.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          If this time no longer works, just reply to this invite and we can move it.
        </p>
        <div className="pt-2">
          <Button asChild size="lg" className="font-semibold"><a href={emailHref}>Contact TeeVents</a></Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:normal]">
          Phone (602) 413 1338, Monday to Friday, 9 AM to 6 PM ET, and email info@teevents.golf.
        </p>
      </section>
    </article>
  </Layout>;
}
