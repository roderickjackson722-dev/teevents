import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { MANAGED_TAG, MANAGED_DEFINITION, ON_SITE_HEADING, ON_SITE_BULLETS } from "@/lib/programTypes";

const emailHref = "mailto:info@teevents.golf?subject=Hybrid%20Managed";

const steps = [
  { title: "Signed agreement", text: "A signed agreement is required before management work starts. The $5,000 management fee is approved in the event budget at signing, with $0 due at signing." },
  { title: "Course and platform", text: "TeeVents handles course negotiation and course communication, and builds the branded TeeVents event page, registration, and sponsor tiers, live in 7 days or less once logo and tournament details arrive." },
  { title: "Launch", text: "Registration launches, sponsor packets and tiers are provided for the group to sell, and TeeVents provides a timeline and consulting throughout the process." },
  { title: "Final prep", text: "TeeVents handles pairings, check in setup, and live scoring preparation." },
  { title: "Event day", text: "TeeVents is on site as tournament coordinator, from check in through awards, and handles post event closeout." },
];

const weManage = [
  "Branded TeeVents event page, registration, and sponsor tiers",
  "Course negotiation and course communication",
  "Food, awards, and vendor recommendations and negotiations",
  "Sponsor packets and tiers, provided for the group to sell",
  "Pairings, check in setup, and live scoring",
  "Timeline and consulting throughout the process",
  "On site event day coordination, from check in through awards",
  "Post event closeout",
];

const groupHandles = [
  "Recruiting players",
  "Selling sponsorships",
  "Paying course, food, awards, and vendor costs directly",
  "Providing logo, tournament details, and one board contact who can approve decisions",
];

const questions = [
  { q: "Do we need money up front to start?", a: <>No money is due at signing. The management fee is approved in the event budget at signing, and is paid from event proceeds.</> },
  { q: "What happens if we raise less than expected?", a: <>The organizer is liable for the full $5,000 management fee, even if proceeds are low.</> },
  { q: "Who pays the golf course, food, awards, and vendors?", a: <>The group pays those costs directly. TeeVents negotiates on your behalf, but does not pay for them.</> },
  { q: "Do you sell sponsorships for us?", a: <>No. TeeVents provides sponsor packets and tiers, and your group sells sponsorships.</> },
  { q: "What if we cancel?", a: <>See the <Link to="/cancellation" className="text-primary underline underline-offset-4">full cancellation policy</Link>.</> },
  { q: "Is travel included?", a: <>No. Travel is quoted separately, on top of the $5,000 management fee.</> },
];

export default function Hybrid() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl space-y-5 px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Hybrid Managed</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">{MANAGED_TAG}</p>
        <p className="text-xl font-medium md:text-2xl">For groups that need a full tournament manager, but do not have money up front.</p>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-primary-foreground/85 [overflow-wrap:normal]">
          Start on TeeVents at no cost, and pay the management fee from money the event raises. We are successful when you are successful.
        </p>
        <div className="pt-2">
          <Button asChild variant="secondary" size="lg" className="font-semibold"><a href={emailHref}>Ask about Hybrid Managed</a></Button>
        </div>
      </div>
    </section>

    <article className="container mx-auto max-w-3xl space-y-12 px-4 py-12 md:py-16">
      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">How Hybrid Managed works</h2>
        <ol className="space-y-5">
          {steps.map((step, index) => <li key={step.title} className="space-y-1">
            <p className="text-lg font-semibold text-foreground">Step {index + 1}, {step.title}</p>
            <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">{step.text}</p>
          </li>)}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Pricing</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Hybrid Managed, starting at $5,000 per event, plus travel quoted separately.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          {MANAGED_DEFINITION}
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Platform: No Cost to Start. Players pay the 5% platform fee at checkout. Stripe processing is separate.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Management fee: $5,000 per event, paid from event proceeds. The organizer is liable for the full $5,000, even if proceeds are low.
        </p>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          <li>$1,875 is due when $3,750 in registrations and sponsorships has been collected through TeeVents.</li>
          <li>The remaining $3,125 is due 7 days before event day.</li>
          <li>Only registrations and sponsorships collected through TeeVents count toward the $3,750 trigger. Payments taken outside TeeVents do not count toward the trigger and do not reduce the fee.</li>
        </ul>
        <div className="rounded-lg border border-border bg-muted/40 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-foreground">Example only, not a guarantee</p>
          <p className="mt-2 leading-relaxed text-foreground/85 [overflow-wrap:normal]">
            At an average registration of $125, 30 players equals $3,750 in registrations. Fewer players plus sponsorships collected through TeeVents can also reach the $3,750 trigger. A minimum field of 50 players at $125 equals $6,250 in registrations alone.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">What we manage for you</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          {weManage.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{ON_SITE_HEADING}</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          {ON_SITE_BULLETS.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">What your group handles</h2>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          {groupHandles.map(item => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">What Hybrid Managed does not include</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          TeeVents negotiates on your behalf, but does not pay for course, food, awards, or vendor costs. TeeVents does not guarantee a player count, sponsorship dollars, or profit. TeeVents does not sell sponsorships for the group. Travel is quoted separately, on top of the $5,000 management fee.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Cancellation</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          If the event cancels, a work fee applies for work already done, starting at $1,500 after course negotiation and platform build, and up to the full $5,000 within 30 days of the event. If the event postpones once to a new date, the fee moves with it at no extra charge.
        </p>
        <p className="text-lg leading-relaxed">
          <Link to="/cancellation" className="text-primary underline underline-offset-4">See the full cancellation policy</Link>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Who Hybrid Managed is for</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Hybrid Managed is for PTA boards, schools, nonprofits, and similar organizations that want a full tournament manager, but do not have money up front.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Hybrid Managed is for events planned months in advance, with a minimum field of 50 players. A signed agreement is required before management work starts.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Common questions</h2>
        <dl className="space-y-5">
          {questions.map(item => <div key={item.q} className="space-y-1">
            <dt className="text-lg font-semibold text-foreground">{item.q}</dt>
            <dd className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">{item.a}</dd>
          </div>)}
        </dl>
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Talk to us about Hybrid Managed</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Tell us about your event, your date, and your group, and we will talk through whether Hybrid Managed fits.
        </p>
        <p className="text-lg leading-relaxed">
          <a href={emailHref} className="text-primary underline underline-offset-4">Ask about Hybrid Managed</a>
        </p>
      </section>
    </article>
  </Layout>;
}
