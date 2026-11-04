import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { SOFTWARE_TAG, SOFTWARE_DEFINITION, MANAGED_TAG, MANAGED_DEFINITION, ON_SITE_HEADING, ON_SITE_BULLETS } from "@/lib/programTypes";

const emailHref = "mailto:info@teevents.golf?subject=TeeVents%20presentation%20follow%20up";

const sectionTitle = "font-display text-2xl font-bold text-foreground md:text-3xl";
const typeTag = "text-xs font-bold uppercase tracking-widest text-primary";
const definitionLine = "text-sm leading-relaxed text-muted-foreground [overflow-wrap:normal]";
const subHeading = "text-sm font-semibold uppercase tracking-wide text-foreground";
const bulletList = "list-disc space-y-1.5 pl-5 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]";
const card = "rounded-lg border border-border bg-muted/40 p-6 space-y-4";

const genericBullets = [
  "Registration and payment only",
  "Payout often after the event",
  "No golf pairings",
  "No live leaderboard",
  "No tournament day help",
];

const teeventsBullets = [
  "Registration and payment",
  "Pairings",
  "Check in",
  "Live scoring",
  "Sponsor tools",
  "Tournament day help",
];

const offers = [
  { title: "Branded event page", bullets: ["One branded page for the whole event", "Built for you or built by you with the same tools", "Full control either way"] },
  { title: "Registration and sponsorships", bullets: ["Online registration", "Sponsor tiers sponsors can pay for on the same page"] },
  { title: "Pairings", bullets: ["Drag and drop pairings", "Alpha list, cart signs, and scorecards"] },
  { title: "QR check in", bullets: ["Fast check in on event day", "Golfer scoring codes"] },
  { title: "Live scoring and leaderboard", bullets: ["Live scoring during play", "Leaderboard players and sponsors can follow"] },
  { title: "Sponsor and auction tools", bullets: ["Sponsor visibility", "Auction tools to help raise more"] },
  { title: "Live budget tracking", bullets: ["Registrations, sponsorships, and money coming in, in one place"] },
  { title: "Done for you setup", bullets: ["We build your page, live in 7 days or less once logo and details arrive", "Every plan includes a dedicated rep"] },
];

const steps = [
  { title: "Step 1, We build your page", bullet: "Live in 7 days or less once logo and details arrive" },
  { title: "Step 2, You share one link", bullet: "Golfers register, sponsors pay, money goes straight to your own Stripe account" },
  { title: "Step 3, We help on event day", bullet: "Pairings, check in, live scoring, so the day runs smoothly" },
];

const moneyBullets = [
  "Organizers connect their own Stripe account, so funds go directly to them",
  "TeeVents never holds your money",
  "Stripe processing, at 2.9% plus $0.30, is separate, and applies in all cases",
  "TeeVents does not issue refunds directly to golfers, refunds to golfers are at the organizer discretion, and are issued by the organizer",
];

const addons = [
  "Live Leaderboard and Mobile Scoring, on No Cost to Start only, included on Per Event and up",
  "Unlimited Manual Entries",
  "Auction Dashboard",
  "Branding Removal and Digital Sponsor",
  "Custom Domain",
];

const nextStepBullets = [
  "A 15 minute demo",
  "No prep needed",
  "No obligation to buy",
  "We will show how TeeVents works, the event page and the back end",
  "You tell us what would work for your tournament",
  "If this time no longer works, just reply to this invite and we can move it",
];

function Block({ heading, bullets }: { heading: string; bullets: string[] }) {
  return <div className="space-y-2">
    <p className={subHeading}>{heading}</p>
    <ul className={bulletList}>
      {bullets.map(item => <li key={item}>{item}</li>)}
    </ul>
  </div>;
}

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

    <article className="container mx-auto max-w-3xl space-y-16 px-4 py-12 md:py-16">
      <section className="space-y-5">
        <h2 className={sectionTitle}>1. Why a golf platform, not a generic registration tool</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Generic tools give you a page to register and pay, but a golf tournament needs much more on event day.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card}>
            <Block heading="Generic registration tools" bullets={genericBullets} />
          </div>
          <div className={card}>
            <Block heading="TeeVents" bullets={teeventsBullets} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className={sectionTitle}>2. What TeeVents offers</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map(item => <div key={item.title} className={card}>
            <p className="text-lg font-semibold text-foreground">{item.title}</p>
            <ul className={bulletList}>
              {item.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
            </ul>
          </div>)}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className={sectionTitle}>Managed Service, On Site, Not Included In Software Plans</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">{MANAGED_DEFINITION}</p>
        <div className={card}>
          <Block heading={ON_SITE_HEADING} bullets={[...ON_SITE_BULLETS]} />
        </div>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Managed Service is a separate service, starting at $5,000 per event, plus travel quoted separately. It is not included in No Cost to Start, Per Event, Per League, or Enterprise.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className={sectionTitle}>3. How it works, in 3 steps</h2>
        <ol className="space-y-6">
          {steps.map(step => <li key={step.title} className="space-y-2">
            <p className="text-lg font-semibold text-foreground">{step.title}</p>
            <ul className={bulletList}>
              <li>{step.bullet}</li>
            </ul>
          </li>)}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitle}>4. How money works</h2>
        <ul className={bulletList}>
          {moneyBullets.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="space-y-5">
        <h2 className={sectionTitle}>5. Pricing, and who each package is good for</h2>
        <div className="space-y-6">
          <div className={card}>
            <div className="flex flex-wrap items-center gap-2"><p className="text-lg font-semibold text-foreground">No Cost to Start</p><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary-foreground">Most Popular</span></div>
            <Block heading="Price" bullets={["$0 to start"]} />
            <Block heading="Includes" bullets={[
              "5% platform fee, paid by players at checkout",
              "10 manual entries",
              "Dedicated rep",
              "Event page built for you, live in 7 days or less",
            ]} />
            <Block heading="Good for" bullets={[
              "Nonprofits",
              "Schools",
              "Churches",
              "First time organizers with no budget to vote on yet",
            ]} />
            <Block heading="Note" bullets={["Live Leaderboard and Mobile Scoring is available as a $99 add on on this plan"]} />
          </div>

          <div className="rounded-lg border-2 border-secondary bg-muted/40 p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground">Per Event</p>
            </div>
            <Block heading="Price" bullets={["$399 per event"]} />
            <Block heading="Includes" bullets={[
              "0% TeeVents platform fee",
              "Live Leaderboard and Mobile Scoring included",
              "Unlimited manual entries",
            ]} />
            <Block heading="Good for" bullets={[
              "Organizers running one event",
              "Organizers who want golfers to pay exactly the entry fee",
              "Organizers who want live scoring included",
            ]} />
            <Block heading="Note, example only" bullets={[
              "At $7,980 in registrations, players collectively pay $399 in fees on No Cost to Start",
              "Above that amount, $399 flat saves players money at checkout",
            ]} />
          </div>

          <div className={card}>
            <p className="text-lg font-semibold text-foreground">Per League</p>
            <Block heading="Price" bullets={["$599 per league"]} />
            <Block heading="Includes" bullets={["Same core platform tools for league play"]} />
            <Block heading="Good for" bullets={["Leagues that need one platform for the season, not just one event"]} />
          </div>

          <div className={card}>
            <p className="text-lg font-semibold text-foreground">Enterprise</p>
            <Block heading="Price" bullets={["$2,999 per year, for 10 or more events"]} />
            <Block heading="Includes" bullets={[
              "Annual plan for golf courses",
              "Whole calendar in one place",
              "Dedicated rep",
            ]} />
            <Block heading="Good for" bullets={[
              "Golf courses running 10 or more events a year",
              "Courses that want one system for the whole calendar, instead of a different tool for each event",
            ]} />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className={sectionTitle}>6. Hybrid Managed</h2>
        <div className={card}>
          <p className="text-lg font-semibold text-foreground">Hybrid Managed</p>
          <Block heading="Price" bullets={[
            "Starting at $5,000 per event, plus travel quoted separately",
            "Platform stays No Cost to Start",
            "Management is paid from event proceeds",
            "$0 due at signing",
            "Organizer is liable for the full $5,000, even if proceeds are low",
            "The $5,000 management fee is separate from, and in addition to, the 5% platform fee. The platform fee is paid by players at checkout, not by the organizer, and it does not reduce the $5,000 management fee.",
          ]} />
          <Block heading="Payment schedule" bullets={[
            "$1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents",
            "Remaining $3,125 is due 7 days before event day",
            "Only collections through TeeVents count toward the $3,750 trigger",
            "Payments taken outside TeeVents do not count toward the trigger and do not reduce the fee",
          ]} />
          <Block heading="What we manage" bullets={[
            "Course negotiation and communication",
            "Food, awards, and vendor recommendations and negotiations",
            "Sponsor packets and tiers",
            "Pairings, check in, and live scoring",
            "Timeline and consulting throughout",
            "On site event day coordination",
          ]} />
          <Block heading="What your group handles" bullets={[
            "Recruiting players",
            "Selling sponsorships",
            "Paying course, food, awards, and vendor costs directly",
          ]} />
          <Block heading="Limits" bullets={[
            "TeeVents does not pay for course, food, awards, or vendor costs",
            "TeeVents does not guarantee a player count, sponsorship dollars, or profit",
          ]} />
          <Block heading="Good for" bullets={[
            "Churches",
            "Schools",
            "Nonprofits and similar groups",
            "Groups that need a full tournament manager, but do not have money up front",
            "Events planned months in advance, with a minimum field of 50 players",
          ]} />
          <Block heading="Cancellation" bullets={[
            "$1,500 after course negotiation and platform build",
            "$3,000 after registration launch and sponsor packet",
            "Full $5,000 within 30 days of the event",
            "If the event postpones once to a new date, the fee moves with it at no extra charge",
          ]} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={sectionTitle}>7. Add ons, $99 each, one time per event</h2>
        <ul className={bulletList}>
          {addons.map(item => <li key={item}>{item}</li>)}
        </ul>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Page build out is included in done for you setup, not a separate add on.
        </p>
      </section>

      <section className="space-y-5 border-t border-border pt-10">
        <h2 className={sectionTitle}>8. Next step</h2>
        <ul className={bulletList}>
          {nextStepBullets.map(item => <li key={item}>{item}</li>)}
        </ul>
        <div className="pt-2">
          <Button asChild variant="secondary" size="lg" className="font-semibold"><a href={emailHref}>Contact TeeVents</a></Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground [overflow-wrap:normal]">
          Phone (602) 413 1338, Monday to Friday, 9 AM to 6 PM ET, and email info@teevents.golf.
        </p>
      </section>
    </article>
  </Layout>;
}
