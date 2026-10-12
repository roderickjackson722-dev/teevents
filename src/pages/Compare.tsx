import { motion } from "framer-motion";
import { AlertTriangle, Check, Globe, Paintbrush, Rocket, Shield, Trophy, User, X } from "lucide-react";
import Layout from "@/components/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Callout, FinalCta, Hero, IconCard, SectionHead, fade } from "@/components/marketing/PageBits";

const never = [
  ["\"I had to build the whole event page myself.\"", "Your rep builds it for you."],
  ["\"I could not get anyone on the phone.\"", "You have a named rep who knows your event."],
  ["\"I paid upfront and lost money.\"", "You only pay when your players pay."],
];
type Mark = "x" | "warn";
const rows: [string, Mark, string, string][] = [
  ["Dedicated rep", "x", "Self-service only", "Included on every plan, free or paid"],
  ["Event page build", "x", "You build it yourself", "Your rep builds it for you"],
  ["Custom leaderboard colors", "x", "Generic template", "Matches your event branding"],
  ["Custom website", "x", "Basic form", "Fully branded event site"],
  ["Pricing model", "x", "Upfront fee or subscription", "Free to start, player-funded"],
  ["Payout timing", "warn", "Varies, sometimes delayed", "Direct to your Stripe account"],
  ["Live leaderboard", "warn", "Often an add-on", "Built-in, branded"],
  ["Mobile scoring", "warn", "Often requires an app", "Works in any browser"],
  ["Sponsor tools", "x", "Limited or none", "Clickable logos and sponsor packages"],
  ["White-label branding", "x", "Platform branding shows", "Remove our branding entirely"],
  ["Custom domain", "x", "Generic URL", "Your own domain"],
  ["Auction dashboard", "warn", "Extra cost", "Built-in"],
  ["League management", "warn", "Limited", "Full season-long tracking"],
  ["Support", "warn", "Email tickets only", "Named rep and priority support"],
];
const pricing = [
  { title: "Most Platforms", hl: false, items: ["Charge $199 to $4,200 per year", "Fees due before your event", "You lose money if turnout is low", "Organizer pays upfront"] },
  { title: "TeeVents No Cost to Start", hl: true, items: ["$0 upfront", "5% fee covered by players at checkout", "Zero risk if turnout is low", "You keep 100% of your revenue"] },
  { title: "TeeVents Enterprise", hl: false, items: ["$2,999 per year", "For courses and clubs running 10 or more events", "0% transaction fees", "Live leaderboard and mobile scoring included"] },
];
const audiences = [
  ["First-Time Organizers", "Free to start. Your rep builds everything. No risk."],
  ["Nonprofits and Charities", "Player-funded fees. 501(c)(3) receipting. Auction tools."],
  ["Golf Courses and Clubs", "Enterprise plan with unlimited events. 0% transaction fees."],
  ["Repeat Tournament Directors", "Clone past events in one click. No double work."],
];
const reasons = [
  [User, "A Named Rep on Every Plan", "Free or paid, you get a real person who knows your event."],
  [Paintbrush, "Custom Leaderboard Colors", "Your rep matches every leaderboard to your event branding."],
  [Globe, "Event Pages That Look Like Real Websites", "Fully branded microsites. Not a form. Not a template."],
  [Shield, "Payments You Can Trust", "Funds go directly to your Stripe account. We never hold your money."],
  [Trophy, "Built for Golf, Not Generic Events", "Pairings, handicaps, scoring, and leaderboards built in."],
  [Rocket, "Zero Risk to Get Started", "Free to start. Pay only when your players register."],
] as const;
const worries = ["Building your own event page from scratch", "Tracking down payments and chasing checks", "Printing and collecting paper scorecards", "Manually updating leaderboards", "Searching for someone to answer a question", "Paying for a platform that did not help you grow", "Rebuilding your event from scratch every year", "Wondering if your sponsors got enough visibility"];
const quotes = [
  ["We have trusted the TeeVents team to organize and manage our NCAA-sanctioned golf tournaments for the past 10 years. That trust has only grown stronger, to the point where we would not choose any other organization to work with.", "Leonard Smoot", "President", "Black College Golf Coaches Association"],
  ["We turned over the golf tournament management duties to Roderick and the TeeVents team, and we have been beyond pleased with the service. From the initial setup to the conclusion of the event, everything was handled with the highest level of professionalism.", "Merral Jackson", "Tournament Director", "National Black College Alumni Hall of Fame"],
];
const faqs = [
  ["Is switching to TeeVents difficult?", "No. Your rep handles the entire setup. You share your event details, upload your assets to the Organizer Toolbox, and we build everything for you."],
  ["What if I am already using another platform?", "You can run TeeVents alongside your current platform or switch entirely. Your rep will help you decide what is best for your event."],
  ["Can I move my existing registrations over?", "Yes. TeeVents supports CSV import so you can bring in your player list without double entry."],
  ["What if my event is bigger or smaller than a typical tournament?", "TeeVents works for events of any size, from 20 players to 500 or more. Your rep will configure the platform to match your event."],
  ["Do I have to commit to a long-term contract?", "No. No Cost to Start and Per-Event plans are pay-as-you-go. Enterprise is billed annually with the option to renew."],
  ["What happens if I do not like it?", "On the No Cost to Start plan, you have zero risk. You only pay when your players register. If you do not love it, you can stop using it at any time."],
];

const Yes = () => <Check className="h-5 w-5 shrink-0 text-golf-green" aria-label="Yes" />;
const No = ({ m }: { m: Mark }) => m === "x" ? <X className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="No" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-secondary" aria-label="Partial" />;

export default function Compare() {
  return (
    <Layout>
      <Hero eyebrow="COMPARE" title="Why Organizers Choose TeeVents" subtitle="Most platforms sell you software and wish you luck. TeeVents delivers a finished event, with a dedicated rep who builds it for you.">
        <p className="mt-4 text-primary-foreground/70">See how TeeVents compares to other tournament and event management platforms.</p>
      </Hero>

      <section className="py-20"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title="Three Things You Will Never Hear From a TeeVents Customer" subtitle="These are the problems other platforms leave you to solve." />
        <div className="grid gap-6 md:grid-cols-3">{never.map(([q, w]) => (
          <motion.div {...fade} key={q} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="font-display text-xl italic text-foreground line-through decoration-secondary/70">{q}</p>
            <p className="mt-4 flex gap-2 font-semibold text-primary"><Yes />{w}</p>
          </motion.div>))}</div>
        <Callout>If you hear any of these from a TeeVents customer, tell us. We will make it right.</Callout>
      </div></section>

      <section className="bg-muted/40 py-20"><div className="container mx-auto max-w-5xl px-4">
        <SectionHead title="TeeVents vs Typical Tournament Software" subtitle="Here is the difference in one view." />
        <motion.div {...fade} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-[1fr_1fr_1fr] text-sm font-semibold md:text-base">
            <div className="p-3 md:p-4">Category</div><div className="p-3 md:p-4 text-muted-foreground">Typical Tournament Software</div><div className="bg-secondary p-3 text-secondary-foreground md:p-4">TeeVents</div>
          </div>
          {rows.map(([c, m, t, us]) => (
            <div key={c} className="grid grid-cols-[1fr_1fr_1fr] border-t border-border text-sm md:text-base">
              <div className="p-3 font-medium md:p-4">{c}</div>
              <div className="flex gap-2 p-3 text-muted-foreground md:p-4"><No m={m} />{t}</div>
              <div className="flex gap-2 bg-secondary/15 p-3 font-medium md:p-4"><Yes />{us}</div>
            </div>))}
        </motion.div>
      </div></section>

      <section className="py-20"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title="Pricing That Works in Your Favor" subtitle="Other platforms charge you whether your event succeeds or not. TeeVents only succeeds when you do." />
        <div className="grid gap-6 md:grid-cols-3">{pricing.map(p => (
          <motion.div {...fade} key={p.title} className={`rounded-xl border p-6 shadow-sm ${p.hl ? "border-2 border-secondary bg-card" : "border-border bg-card"}`}>
            <h3 className="font-display text-2xl font-bold text-primary">{p.title}</h3>
            <ul className="mt-5 space-y-3">{p.items.map(i => <li key={i} className="flex gap-2">{p.title === "Most Platforms" ? <X className="h-5 w-5 shrink-0 text-muted-foreground" /> : <Yes />}{i}</li>)}</ul>
          </motion.div>))}</div>
        <Callout>If you run fewer than 10 events a year, No Cost to Start or Per-Event is almost always cheaper than a subscription. If you run 10 or more, Enterprise pays for itself.</Callout>
      </div></section>

      <section className="bg-muted/40 py-20"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title="TeeVents Is Built For You If..." subtitle="Whether you are new to running tournaments or a seasoned pro, TeeVents is designed for you." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{audiences.map(([t, d]) => (
          <motion.div {...fade} key={t} className="rounded-xl border-t-4 border-secondary bg-card p-6 shadow-sm"><h3 className="font-display text-xl font-bold text-primary">{t}</h3><p className="mt-3 text-muted-foreground">{d}</p></motion.div>))}</div>
      </div></section>

      <section className="py-20"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title="Six Reasons Organizers Switch to TeeVents" subtitle="Here is what you get with TeeVents that you will not find elsewhere." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{reasons.map(([I, t, d]) => <IconCard key={t} icon={I} title={t} text={d} />)}</div>
      </div></section>

      <section className="bg-muted/40 py-20"><div className="container mx-auto max-w-4xl px-4">
        <SectionHead title="What You Will Never Worry About Again" subtitle="These are the things our customers stopped worrying about on day one." />
        <motion.ul {...fade} className="grid gap-4 md:grid-cols-2">{worries.map(w => <li key={w} className="flex gap-3 rounded-lg bg-card p-4 shadow-sm"><X className="h-5 w-5 shrink-0 text-destructive" />{w}</li>)}</motion.ul>
        <Callout>Every one of these is handled by TeeVents and your dedicated rep.</Callout>
      </div></section>

      <section className="py-20"><div className="container mx-auto max-w-5xl px-4">
        <SectionHead title="What Organizers Say After Switching" />
        <div className="grid gap-6 md:grid-cols-2">{quotes.map(([q, n, t, o]) => (
          <motion.figure {...fade} key={n} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <blockquote className="text-lg text-foreground">"{q}"</blockquote>
            <figcaption className="mt-5"><p className="font-semibold text-primary">{n}</p><p className="text-sm text-muted-foreground">{t}, {o}</p></figcaption>
          </motion.figure>))}</div>
      </div></section>

      <section className="bg-muted/40 py-20"><div className="container mx-auto max-w-3xl px-4">
        <SectionHead title="Common Questions About Switching" />
        <Accordion type="single" collapsible className="rounded-xl bg-card px-6 shadow-sm">{faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q}><AccordionTrigger className="text-left">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>))}</Accordion>
      </div></section>

      <FinalCta title="Ready to See the Difference?" subtitle="Free for organizers. A dedicated rep builds your event for you." />
    </Layout>
  );
}
