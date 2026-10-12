import { ArrowRight, Check, Globe, ShieldCheck, Trophy, UserRound, Users, Gavel, LayoutTemplate, Megaphone, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import EnterpriseInquiryDialog from "@/components/pricing/EnterpriseInquiryDialog";

const plans = [
  { name: "No Cost to Start", price: "$0", unit: "", badge: "", description: "Free for you. A 5% service fee is included in each player's registration total, so you keep 100% of your event revenue.", features: ["Full tournament management platform", "Branded tournament website", "Online registration and Stripe payments", "QR check-in from any phone", "Pairings, tee sheets, and drag-and-drop scheduling", "Player management, waitlist, and CSV import", "Volunteer coordination and shift scheduling", "Printables: scorecards, cart signs, name badges", "Email confirmations and basic reporting", "Financial dashboard and Stripe payouts", "Public listing on teevents.golf", "10 manual entries included", "Dedicated TeeVents rep who builds your event", "No monthly subscription"], cta: "SELECT NO COST TO START", to: "/signup?plan=no-cost", note: "No monthly subscription." },
  { name: "Per-Event", price: "$299", unit: "per tournament", badge: "MOST POPULAR", description: "Pay once per tournament. No platform transaction fees. Keep 100% of your registration revenue.", features: ['Everything in "No Cost to Start"', "No 5% platform fee", "Unlimited manual entries", "Unlimited transactions", "Dedicated TeeVents rep who builds your event", "One-time, per event"], cta: "SELECT PER-EVENT", to: "/signup?plan=per-event", note: "Standard card processing fees still apply." },
  { name: "Per-League", price: "$499", unit: "per league", badge: "", description: "Perfect for season-long leagues with multiple events and standings.", features: ['Everything in "Per-Event"', "Covers the entire league season", "League standings and leaderboards", "Season-long reporting", "Dedicated TeeVents rep who manages your league"], cta: "SELECT PER-LEAGUE", to: "/signup?plan=per-league", note: "One league, one season-long price." },
  { name: "Enterprise", price: "$2,999", unit: "per year", badge: "BEST FOR 10 OR MORE EVENTS A YEAR", description: "For golf courses, clubs, and organizations running 10 or more events a year.", features: ["Unlimited tournaments and leagues", "0% TeeVents transaction fees", "Live leaderboard and mobile scoring included on every event", "Dedicated TeeVents rep who builds every event", "Custom branding", "Staff accounts with role-based permissions", "Priority support", "Club page with all upcoming events"], cta: "REQUEST ENTERPRISE", to: "", note: "Billed annually. No per-event fees." },
];
const included = [
  { icon: UserRound, title: "A Named TeeVents Rep", description: "Your event built by a real person, free or paid." },
  { icon: Globe, title: "Custom Website Page", description: "Branded event page with your logo, colors, and sponsors." },
  { icon: Trophy, title: "Custom Leaderboard", description: "Your rep matches every leaderboard to your event colors." },
  { icon: ShieldCheck, title: "Secure Payments", description: "Payments go straight to your Stripe account. We never hold your money." },
];
const addons = [
  { icon: Trophy, title: "Live Leaderboard and Mobile Scoring", description: "Real-time leaderboard with mobile scoring from any phone. No app download required.", slug: "live-leaderboard" },
  { icon: Users, title: "Unlimited Manual Entries", description: "Remove the 10-entry cap. Add unlimited manual player registrations, sponsors, and side-event entries.", slug: "unlimited-manual-entries" },
  { icon: Gavel, title: "Auction Dashboard", description: "Mobile bidding dashboard with auto-draw at close and real-time bid tracking.", slug: "auction-raffle" },
  { icon: LayoutTemplate, title: "Full-Service Page Build Out", description: "Our team designs a custom event page for you with layout, colors, content, and branding.", slug: "custom-event-page" },
  { icon: Megaphone, title: "Branding Removal and Digital Sponsor", description: 'TeeVents branding hidden. Custom "Presented by" logo and a turnkey digital sponsor package you can resell for $5,000 to $10,000.', slug: "branding-removal" },
  { icon: Globe, title: "Custom Domain", description: "Brand your tournament URL (example: golfyourclub.com) instead of a teevents.golf link.", slug: "custom-domain" },
];
const payments = [
  ["Golfer Pays", "Full registration amount charged at checkout via Stripe."],
  ["Your Plan Applies", "No Cost to Start: a 5% platform fee covered by players. Paid plans: 0% platform transaction fees."],
  ["Stripe Fee Applied", "Standard 2.9% + $0.30 processing fee deducted by Stripe."],
  ["You Get Paid", "Net proceeds land directly in your connected Stripe account. New Stripe accounts: funds typically available within 2 to 7 business days."],
];
const comparison = [
  ["Upfront cost", "$0", "$299 per tournament", "$499 per league", "$2,999 per year"],
  ["Transaction fee", "5% (covered by players)", "0%", "0%", "0%"],
  ["Events included", "Pay as you go", "Pay as you go", "One league season", "Unlimited"],
  ["Dedicated rep", "Included", "Included", "Included", "Included"],
  ["Live leaderboard", "Add-on: $99", "Add-on: $99", "Add-on: $99", "Included"],
  ["Custom branding", "TeeVents branding", "TeeVents branding", "TeeVents branding", "Custom branding"],
  ["Best for", "Nonprofits and first-time organizers", "Organizers who want predictable costs", "Season-long leagues", "Courses and clubs running 10 or more events a year"],
];
const faqs = [
  ["Do I really get a dedicated rep on the free plan?", "Yes. Every event on TeeVents, free or paid, includes a dedicated TeeVents rep who builds your event page, sets up your registration, and configures your leaderboard."],
  ["What is the 5% platform fee?", "On the No Cost to Start plan, a 5% platform fee is added to each player's registration total at checkout. You keep 100% of your event revenue. Your players cover the fee."],
  ["Can I pass the fee to my players?", "Yes. On the No Cost to Start plan, the 5% fee is automatically added to each registration at checkout. Players see it as a service fee, similar to Eventbrite."],
  ["When do I get paid?", "Funds land directly in your connected Stripe account. New Stripe accounts typically see funds available within 2 to 7 business days. TeeVents never holds your money."],
  ["What if I run more than 10 events a year?", "Enterprise is built for you. $2,999 per year for unlimited tournaments and leagues, with 0% transaction fees and live leaderboard and mobile scoring included on every event."],
  ["Can I switch plans later?", "Yes. You can upgrade from No Cost to Start to Per-Event, Per-League, or Enterprise at any time."],
  ["Do I need a Stripe account?", "Yes, but setup takes 5 to 10 minutes. TeeVents helps you connect your Stripe account during onboarding."],
];
const section = "px-5 py-16 md:px-8 md:py-24";
const heading = "text-3xl font-display font-bold md:text-4xl";

export default function Plans() {
  return <Layout>
    <SEO title="Simple, Transparent Pricing | TeeVents" description="Choose $0 to start, $299 per event, $499 per league, or $2,999 per year Enterprise. Every plan includes a dedicated TeeVents rep." path="/pricing" />
    <div className="pricing-page">
      <section aria-labelledby="pricing-title" className={`${section} bg-primary text-primary-foreground text-center`}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-sm font-semibold text-secondary">PRICING</p>
          <h1 id="pricing-title" className="text-4xl font-display font-bold md:text-6xl">Simple, Transparent Pricing</h1>
          <p className="mt-6 text-lg leading-relaxed text-primary-foreground/85">Choose the plan that fits your event. Start free, pay per event, or run unlimited events with Enterprise.</p>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-primary-foreground/85">Every plan includes a dedicated TeeVents rep who builds your event page, sets up your leaderboard, and configures everything for you. <strong className="text-secondary">Free or paid.</strong></p>
        </div>
      </section>

      <section aria-label="The four plans" className={`${section} bg-muted/40`}>
        <div className="mx-auto grid max-w-[1440px] items-stretch gap-5 lg:grid-cols-4">
          {plans.map((plan, index) => <article key={plan.name} className={`relative flex min-w-0 flex-col rounded-lg border p-6 ${index === 1 ? "border-2 border-secondary bg-card lg:-my-3 lg:py-9" : index === 3 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            <div className="mb-5 flex min-h-10 items-center">{plan.badge && <span className="rounded-sm bg-secondary px-3 py-2 text-center text-xs font-bold leading-relaxed text-secondary-foreground">{plan.badge}</span>}</div>
            <h2 className="text-2xl font-display font-bold">{plan.name}</h2>
            <div className="my-5"><span className="text-4xl font-display font-bold">{plan.price}</span>{plan.unit && <p className={`mt-1 text-sm ${index === 3 ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{plan.unit}</p>}</div>
            <p className={`mb-6 text-sm leading-relaxed ${index === 3 ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{plan.description}</p>
            <ul className="mb-8 space-y-3">{plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm leading-relaxed"><Check aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 ${index === 3 ? "text-secondary" : "text-primary"}`} /><span>{feature}</span></li>)}</ul>
            <div className="mt-auto">
              {index === 3 ? <EnterpriseInquiryDialog><Button variant="secondary" className="h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-xs font-bold">{plan.cta}<ArrowRight /></Button></EnterpriseInquiryDialog> : <Button asChild variant="secondary" className="h-auto min-h-12 w-full whitespace-normal px-3 py-3 text-xs font-bold"><Link to={plan.to}>{plan.cta}<ArrowRight /></Link></Button>}
              <p className={`mt-4 min-h-9 text-center text-xs leading-relaxed ${index === 3 ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{plan.note}</p>
            </div>
          </article>)}
        </div>
      </section>

      <section aria-labelledby="included-title" className={section}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center"><h2 id="included-title" className={heading}>What Every Plan Includes</h2><p className="mt-4 text-muted-foreground">No matter which plan you choose, you get the same dedicated service.</p></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{included.map(item => <article key={item.title} className="rounded-lg border border-border p-6"><item.icon aria-hidden="true" className="mb-6 h-8 w-8 text-primary" /><h3 className="mb-3 text-xl font-display font-bold">{item.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p></article>)}</div>
          <p className="mx-auto mt-12 max-w-3xl border-l-4 border-secondary pl-6 text-lg leading-relaxed text-primary">Most platforms sell you software and wish you luck. TeeVents delivers a finished event. You tell us what you want and we build it.</p>
        </div>
      </section>

      <section aria-labelledby="addons-title" className={`${section} bg-muted/40`}>
        <div className="mx-auto max-w-5xl"><h2 id="addons-title" className={heading}>Add-On Features</h2><p className="mt-4 text-muted-foreground">All $99 each. One-time, per event. Select an add-on to go straight to checkout.</p>
          <div className="mt-10 divide-y divide-border">{addons.map(addon => <article key={addon.slug} className="flex flex-col gap-5 py-7 sm:flex-row sm:items-center"><addon.icon aria-hidden="true" className="h-7 w-7 shrink-0 text-primary" /><div className="min-w-0 flex-1"><h3 className="text-xl font-display font-bold">{addon.title}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{addon.description}</p>{addon.slug === "custom-event-page" && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your named rep and standard event setup remain included on every plan. This optional custom design does not add a rep charge.</p>}</div><div className="shrink-0 sm:text-right"><p className="mb-2 text-2xl font-display font-bold">$99</p><Button asChild variant="link" className="h-auto p-0"><Link to={`/checkout/${addon.slug}`}>Select and check out<ArrowRight /></Link></Button></div></article>)}</div>
        </div>
      </section>

      <section aria-labelledby="payments-title" className={`${section} bg-primary text-primary-foreground`}>
        <div className="mx-auto max-w-6xl"><div className="mx-auto max-w-3xl text-center"><p className="mb-4 text-sm font-semibold text-secondary">HOW PAYMENTS WORK</p><h2 id="payments-title" className={heading}>We Never Hold Your Money</h2><p className="mt-5 leading-relaxed text-primary-foreground/85">Payments split automatically at checkout using Stripe Connect. Your funds go directly to your Stripe account. TeeVents never touches them.</p></div>
          <ol className="mt-14 grid gap-9 sm:grid-cols-2 lg:grid-cols-4">{payments.map(([title, description], index) => <li key={title}><span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-secondary text-lg font-bold text-secondary">{index + 1}</span><h3 className="mb-3 text-xl font-display font-bold">{title}</h3><p className="text-sm leading-relaxed text-primary-foreground/80">{description}</p></li>)}</ol>
          <p className="mt-12 border-t border-primary-foreground/20 pt-8 text-center font-semibold leading-relaxed">TeeVents never holds your money. Stripe sends net proceeds directly to your bank account on your schedule.</p>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-primary-foreground/75"><Lock className="h-4 w-4 shrink-0" />PCI Level 1 payments · SSL encryption · Apple Pay and Google Pay · Stripe Radar</p>
        </div>
      </section>

      <section aria-labelledby="compare-title" className={section}>
        <div className="mx-auto max-w-6xl"><h2 id="compare-title" className={`${heading} mb-10 text-center`}>Compare Your Options</h2><div className="overflow-x-auto rounded-lg border border-border"><table className="pricing-comparison w-full min-w-[900px] text-left text-sm"><caption className="sr-only">TeeVents pricing plans and included features</caption><thead className="bg-muted"><tr><th scope="col" className="p-5">Feature</th>{plans.map(plan => <th scope="col" key={plan.name} className={`p-5 ${plan.name === "Per-Event" ? "bg-secondary/15" : ""}`}>{plan.name}</th>)}</tr></thead><tbody>{comparison.map(([label, ...cells]) => <tr key={label} className="border-t border-border"><th scope="row" className="p-5 font-semibold">{label}</th>{cells.map((cell, index) => <td key={index} className={`p-5 leading-relaxed ${index === 1 ? "bg-secondary/10" : ""}`}>{cell}</td>)}</tr>)}</tbody></table></div></div>
      </section>

      <section aria-labelledby="faq-title" className={`${section} bg-muted/40`}>
        <div className="mx-auto max-w-3xl"><h2 id="faq-title" className={`${heading} mb-10 text-center`}>Frequently Asked Questions</h2><Accordion type="single" collapsible>{faqs.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`}><AccordionTrigger className="gap-5 py-6 text-left text-base font-semibold">{question}</AccordionTrigger><AccordionContent className="pr-6 text-base leading-relaxed text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion></div>
      </section>

      <section aria-labelledby="final-title" className={`${section} bg-primary text-primary-foreground text-center`}>
        <div className="mx-auto max-w-3xl"><h2 id="final-title" className={heading}>Ready to See Your Event on TeeVents?</h2><p className="mt-5 text-lg text-primary-foreground/85">Free for organizers. A dedicated rep builds it for you.</p><div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row"><Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/get-started">GET STARTED<ArrowRight /></Link></Button><Button asChild variant="outline" size="lg" className="border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/request-sample">REQUEST A SAMPLE</Link></Button></div></div>
      </section>
    </div>
  </Layout>;
}
