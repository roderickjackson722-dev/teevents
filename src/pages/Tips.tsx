import { Check } from "lucide-react";
import Layout from "@/components/Layout";
import { FinalCta, Hero, h2 } from "@/components/marketing/PageBits";

const tipSections: { heading: string; tips: string[] }[] = [
  { heading: "Plan Early", tips: [
    "Book the course four to nine months out for a charity event.",
    "Start sponsorships three to six months out, and lead with the audience, field size and who those players are.",
    "Open registration eight to twelve weeks before the event, and remind players at 30 days and at 10 days.",
  ] },
  { heading: "Sponsorships Are Where The Money Is", tips: [
    "Registration fees usually cover the course. Sponsors fund the mission.",
    "Keep the tier ladder to five or six rungs: presenting, gold, beverage cart or lunch or awards, contest, hole, and in kind.",
    "Hole sponsorships are the volume tier. Most charity tournaments price hole sponsorships between $250 and $1,000 depending on market and event size.",
    "Collect logos at purchase, so the sponsor submits the logo, link, and description without chasing.",
    "Within one week after the event, send a short report with photos, field size, and amount raised, and invite the sponsor to renew.",
  ] },
  { heading: "Registration That Fills The Field", tips: [
    "Set pricing before you build anything, and work backwards from the course contract.",
    "Offer individual, foursome, sponsor package, dinner only, and volunteer tickets.",
    "Ask only what you need at registration. Every extra field costs completions.",
    "Add ons routinely add registration revenue at charity events: mulligans, skins, closest to the pin, raffle bundles, donations, and player gifts.",
  ] },
  { heading: "Pairings Without The Chaos", tips: [
    "Keep purchased foursomes intact, place the title sponsor and VIPs where they are visible, and spread known slow groups.",
    "Use eight to ten minutes between tee times for a mixed ability charity field.",
    "Validate pairings before you publish, lock them so no one changes them on event day, and generate scoring codes only after pairings exist.",
    "Tell every player their group, starting hole, and tee time the day before.",
  ] },
  { heading: "Live Scoring On Event Day", tips: [
    "Brief one scorekeeper per group at check in.",
    "Print paper scorecards anyway, and keep paper as the official record if there is a dispute.",
    "Display the leaderboard on a clubhouse screen, and share the public leaderboard link so family can follow from home.",
    "Freeze the leaderboard, verify the top three in each flight against their cards, and then share the final leaderboard link.",
    "Your director sets up mobile scoring, sends scoring codes, and runs the live leaderboard in your event colors. Your rep is on call on event day for live scoring and leaderboard challenges.",
  ] },
  { heading: "Formats And Handicaps, In Plain Words", tips: [
    "Mixed ability charity or corporate event, use a scramble.",
    "Own ball but team scoring, use best ball.",
    "Serious competitive field, use net stroke play with flights.",
    "Pace of play matters, use Stableford.",
    "Publish the allowance formula and the maximum handicap on the event page before the round, and announce whether prizes are gross, net, or both.",
  ] },
];

const enhancements: [string, string][] = [
  ["Live Leaderboard and Mobile Scoring", "$99 on the free plan, included with Per-Event and up"],
  ["Auction Dashboard", "$99"],
  ["Branding Removal and Digital Sponsor", "$99"],
  ["Custom Domain", "$99"],
  ["Unlimited Manual Entries", "$99"],
  ["Full Service Management, on site", "Contact us for a quote"],
];

export default function Tips() {
  return (
    <Layout>
      <Hero eyebrow="TIPS" title="Tips for a Successful Golf Tournament" subtitle="What your virtual Tournament director does for you, and what to plan early so your event comes back next year.">
        <p className="mx-auto mt-5 max-w-2xl text-base text-primary-foreground/85 md:text-lg">Setting up a tournament takes months of preparation, and that is why good events do not come back for year two. Your virtual Tournament director does the setup for you, so your event comes back. These tips are the same playbook our directors use with organizers.</p>
      </Hero>

      {tipSections.map((s, i) => (
        <section key={s.heading} className={i % 2 ? "bg-muted/40 py-16" : "bg-background py-16"}>
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className={h2}>{s.heading}</h2>
            <ul className="mt-6 space-y-3">
              {s.tips.map((t) => (
                <li key={t} className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><span className="text-muted-foreground">{t}</span></li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="bg-background py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className={h2}>Ways To Make Your Event Bigger</h2>
          <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {enhancements.map(([name, price]) => (
              <li key={name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-foreground">{name}</span><span className="text-sm text-muted-foreground">{price}</span></li>
            ))}
          </ul>
          <p className="mt-6 font-semibold text-primary">Your director builds it all for you. You can open your event any time and change anything.</p>
        </div>
      </section>

      <FinalCta title="Ready to See Your Event on TeeVents?" subtitle="Free for organizers. A dedicated rep builds it for you." />
    </Layout>
  );
}
