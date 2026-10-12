import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sheet, Banknote, MonitorX, ClipboardPen, Shuffle, LifeBuoy,
  Layers, Landmark, Globe, Trophy, Move, UserRound, ShieldCheck,
  HeartHandshake, Briefcase, Flag, GraduationCap, Church, CalendarRange,
  Image, Palette, ImagePlus, Award, FileText, Camera, Quote, Check,
} from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fade, Hero, SectionHead, IconCard, Callout, GetStarted, OutlineLight, FinalCta } from "@/components/marketing/PageBits";

const problems = [
  [Sheet, "Spreadsheets Everywhere", "Registrations in one sheet, pairings in another, payments in a third."],
  [Banknote, "Manual Payments and Chasing Checks", "Tracking who paid, who owes, and who needs a refund."],
  [MonitorX, "Building a Website From Scratch", "Spending hours on a site builder when you should be planning the event."],
  [ClipboardPen, "Scorecards and Manual Scoring", "Printing cards, collecting them, and entering scores by hand."],
  [Shuffle, "Last-Minute Changes", "A player drops out and everything cascades into chaos."],
  [LifeBuoy, "No Real Support", "When something breaks, you are on your own with a help doc."],
] as const;
const solutions = [
  [Layers, "Everything in One Platform", "Registration, payments, pairings, scoring, and results, all in one place."],
  [Landmark, "Payments You Never Chase", "Funds go straight to your Stripe account. We never hold your money."],
  [Globe, "A Website Built For You", "Your rep designs your event page with your logo, colors, and sponsors."],
  [Trophy, "Live Scoring and Leaderboards", "Players score from their phones. Leaderboards update in real time."],
  [Move, "Changes in Seconds", "Drag-and-drop pairings. Instant updates. No reprinting."],
  [UserRound, "A Named Rep Who Answers", "A dedicated TeeVents rep who knows your event before, during, and after."],
] as const;
const audiences = [
  [HeartHandshake, "Nonprofits and Charities", "Fundraising tournaments with donation widgets, silent auctions, and 501(c)(3) receipting."],
  [Briefcase, "Corporate Events", "Client appreciation outings, employee tournaments, and networking events."],
  [Flag, "Golf Courses and Clubs", "Member-guest tournaments, club championships, and league play."],
  [GraduationCap, "Schools and Alumni Groups", "Scholarship fundraisers, alumni golf classics, and athletic department events."],
  [Church, "Churches and Community Groups", "Charity outings, fellowship tournaments, and community fundraisers."],
  [CalendarRange, "Leagues and Associations", "Season-long leagues with standings, weekly play, and recurring events."],
] as const;
const plans = [
  ["No Cost to Start", "$0", "A 5% service fee is included in each player's registration total. You keep 100% of your event revenue."],
  ["Per-Event", "$299", "Per tournament. No platform transaction fees. Keep every dollar of registration revenue."],
  ["Enterprise", "$2,999", "Per year. For courses and clubs running 10 or more events a year."],
];
const quotes = [
  ["We have trusted the TeeVents team to organize and manage our NCAA-sanctioned golf tournaments for the past 10 years. That trust has only grown stronger, to the point where we would not choose any other organization to work with.", "Leonard Smoot", "President, Black College Golf Coaches Association"],
  ["We turned over the golf tournament management duties to Roderick and the TeeVents team, and we have been beyond pleased with the service. From the initial setup to the conclusion of the event, everything was handled with the highest level of professionalism.", "Merral Jackson", "Tournament Director, National Black College Alumni Hall of Fame"],
];
const toolbox = [[Image, "Event logo"], [Palette, "Brand colors"], [ImagePlus, "Hero image"], [Award, "Sponsor logos"], [FileText, "Event documents and waivers"], [Camera, "Photo gallery and additional notes"]] as const;
const faqs = [
  ["Do I really get a dedicated rep on the free plan?", "Yes. Every event on TeeVents, free or paid, includes a dedicated rep who builds your event for you."],
  ["What if I have never run a tournament before?", "TeeVents is built for first-time organizers. Your rep walks you through every step."],
  ["Can I use my own payment system?", "TeeVents uses Stripe for payments. Setup takes 5 to 10 minutes and your rep will help you connect it."],
  ["How long does setup take?", "Most events are live within a few days of signup. Complex events may take longer, and your rep will give you a timeline during your first call."],
  ["Can I run multiple events per year?", "Yes. Per-Event pricing is $299 per tournament. Enterprise is unlimited for $2,999 per year."],
];

function Steps({ items }: { items: [string, string][] }) {
  return (
    <div className={`grid gap-6 ${items.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
      {items.map(([t, d], i) => (
        <motion.div {...fade} key={t} className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-display text-xl font-bold text-secondary-foreground">{i + 1}</div>
          <h3 className="font-body text-lg font-semibold text-foreground">{t}</h3>
          <p className="mt-2 text-muted-foreground">{d}</p>
        </motion.div>
      ))}
    </div>
  );
}

const wrap = "container mx-auto max-w-6xl px-4";

export default function ForOrganizers() {
  return (
    <Layout>
      <SEO title="For Tournament Organizers" description="You run the tournament. Your dedicated TeeVents rep builds your event page, registration, pairings, and live leaderboard, free or paid." path="/for-organizers" />

      <Hero eyebrow="FOR TOURNAMENT ORGANIZERS" title="You Run the Tournament. We Build Everything Else." subtitle="From your branded event page to your live leaderboard, your TeeVents rep handles the setup so you can focus on the day that matters.">
        <p className="mt-6 font-semibold text-secondary">Free for organizers. A dedicated rep on every event, free or paid.</p>
        <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row"><GetStarted /><OutlineLight to="/request-sample">REQUEST A SAMPLE</OutlineLight></div>
      </Hero>

      <section className="bg-background py-20 md:py-28"><div className={wrap}>
        <SectionHead title="Running a Tournament Should Not Mean Drowning in Software" subtitle="Here is what most organizers deal with before every event." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{problems.map(([i, t, d]) => <IconCard key={t} icon={i} title={t} text={d} />)}</div>
        <Callout>TeeVents was built by a tournament director who lived every one of these problems. That is why the platform works the way it does.</Callout>
      </div></section>

      <section className="bg-muted/40 py-20 md:py-28"><div className={wrap}>
        <SectionHead title="Here Is What Changes With TeeVents" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{solutions.map(([i, t, d]) => <IconCard key={t} icon={i} title={t} text={d} />)}</div>
        <Callout>This is not software you have to figure out. This is a service you get to use.</Callout>
      </div></section>

      <section className="bg-background py-20 md:py-28"><div className={wrap}>
        <SectionHead eyebrow="HOW IT WORKS" title="Three Simple Steps" />
        <Steps items={[["Tell Us About Your Event", "Share your event details, logo, colors, and goals with your named TeeVents rep. This takes about 15 minutes."], ["We Build It For You", "Your rep sets up your branded site, registration, sponsor page, pairings, and scoring. You review and approve."], ["Run Your Tournament", "Everything is ready to go, with your dedicated partner before, during, and after the event."]]} />
        <div className="mt-10 text-center"><GetStarted /></div>
      </div></section>

      <section className="bg-muted/40 py-20 md:py-28"><div className={wrap}>
        <SectionHead title="What Every Organizer Gets" subtitle="Same dedicated service on every plan, free or paid." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <IconCard icon={UserRound} title="A Named Rep" text="Your event built by a real person, not a template." />
          <IconCard icon={Globe} title="Custom Event Page" text="Your logo, colors, and sponsors on a fully branded site." />
          <IconCard icon={Trophy} title="Live Leaderboard" text="Custom colors and real-time scoring from any phone." />
          <IconCard icon={ShieldCheck} title="Secure Payments" text="Funds go directly to your Stripe account. We never hold your money." />
        </div>
      </div></section>

      <section className="bg-background py-20 md:py-28"><div className={wrap}>
        <SectionHead title="Built for Every Kind of Organizer" subtitle="If you are running a golf event, TeeVents is for you." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{audiences.map(([i, t, d]) => <IconCard key={t} icon={i} title={t} text={d} />)}</div>
      </div></section>

      <section className="bg-muted/40 py-20 md:py-28"><div className={wrap}>
        <SectionHead title="Simple Pricing for Every Organizer" subtitle="Start free. Pay per event. Or run unlimited events with Enterprise." />
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map(([n, p, d]) => (
            <motion.div {...fade} key={n} className="rounded-xl border border-border bg-card p-7 text-center shadow-sm">
              <h3 className="font-body text-lg font-semibold text-foreground">{n}</h3>
              <p className="mt-3 font-display text-5xl font-bold text-primary">{p}</p>
              <p className="mt-4 text-muted-foreground">{d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center"><Button asChild size="lg" className="font-bold"><Link to="/pricing">VIEW FULL PRICING</Link></Button></div>
      </div></section>

      <section className="bg-background py-20 md:py-28"><div className={wrap}>
        <SectionHead title="What Organizers Say About TeeVents" />
        <div className="grid gap-6 lg:grid-cols-2">
          {quotes.map(([q, n, r]) => (
            <motion.figure {...fade} key={n} className="rounded-2xl border border-border border-t-4 border-t-secondary bg-card p-8 shadow-md">
              <Quote className="h-8 w-8 text-secondary" aria-hidden="true" />
              <blockquote className="mt-4 font-display text-lg leading-relaxed text-foreground">“{q}”</blockquote>
              <figcaption className="mt-6"><p className="font-semibold text-foreground">{n}</p><p className="text-sm text-muted-foreground">{r}</p></figcaption>
            </motion.figure>
          ))}
        </div>
        <div className="mt-10 text-center"><Button asChild variant="outline" size="lg" className="font-bold"><Link to="/reviews">READ MORE REVIEWS</Link></Button></div>
      </div></section>

      <section className="bg-muted/40 py-20 md:py-28"><div className="container mx-auto max-w-4xl px-4">
        <SectionHead title="Everything You Need to Upload in One Place" subtitle="When you sign up, your Organizer Toolbox is where you upload everything your rep needs." />
        <p className="-mt-4 text-center text-lg text-muted-foreground">Logos, brand colors, hero images, sponsor logos, waivers, rules sheets, and anything else you want on your site. Your rep reviews your toolbox and starts building right away.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {toolbox.map(([I, t]) => <motion.li {...fade} key={t} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><I className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" /><span className="font-medium text-foreground">{t}</span></motion.li>)}
        </ul>
        <Callout>You are never on your own. Your rep contacts you within 1 business day of signup.</Callout>
      </div></section>

      <section className="bg-background py-20 md:py-28"><div className={wrap}>
        <SectionHead eyebrow="GETTING STARTED" title="From Signup to Live Event in Days, Not Weeks" />
        <Steps items={[["Sign Up Free", "Create your account and tell us about your event. Takes about 15 minutes."], ["Upload Your Assets", "Add your logo, colors, and event details to the Organizer Toolbox."], ["Meet Your Rep", "Your dedicated TeeVents rep contacts you within 1 business day to review everything."], ["Go Live", "Your event page, registration, and leaderboard are ready. Share the link and open registration."]]} />
        <div className="mt-10 text-center"><GetStarted /></div>
      </div></section>

      <section className="bg-muted/40 py-20 md:py-28"><div className="container mx-auto max-w-3xl px-4">
        <SectionHead title="Common Questions From Organizers" />
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-6">
          {faqs.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground"><span className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />{a}</span></AccordionContent></AccordionItem>)}
        </Accordion>
        <div className="mt-10 text-center"><Button asChild variant="outline" size="lg" className="font-bold"><Link to="/faq">SEE ALL FAQS</Link></Button></div>
      </div></section>

      <FinalCta title="Ready to Run a Better Tournament?" subtitle="Free for organizers. A dedicated rep builds it for you." />
    </Layout>
  );
}
