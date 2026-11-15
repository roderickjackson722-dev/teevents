import { Quote } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const SMOOT_QUOTE = "We have trusted the TeeVents team to organize and manage our NCAA-sanctioned golf tournaments for the past 10 years. That trust has only grown stronger, to the point where we would not choose any other organization to work with. Their hard work, preparation, attention to detail, and professionalism are unmatched when it comes to running our multiple college golf tournaments.";

const steps = [
  ["Tell us about your event", "Short questionnaire."],
  ["We reach out within 48 hours", "Your rep contacts you to get started."],
  ["Your event page goes live", "In 7 days or less."],
  ["We're on call on tournament day", "Support while your event runs."],
];

const faqs = [
  ["Do golfers need an app?", "No. Everything works in a mobile browser."],
  ["Which formats can I run?", "Scrambles, best ball, skins, and other popular formats."],
  ["Can I import my player list?", "Yes. Upload a roster CSV."],
  ["When do I get paid?", "Payments go to your own Stripe account as golfers register. New Stripe accounts can take 2 to 7 business days for funds to become available."],
  ["What if something breaks on tournament day?", "We're on call during your event."],
];

/** Presentation-only trust section shared by the homepage and pricing page. */
export default function TrustAndProof({ showTestimonial = true }: { showTestimonial?: boolean }) {
  return <section aria-labelledby="trust-proof-title" className="bg-background px-5 py-14 md:px-8 md:py-20">
    <div className="mx-auto max-w-5xl space-y-14">
      {showTestimonial && <figure className="mx-auto max-w-3xl">
        <Quote className="mx-auto mb-5 h-8 w-8 text-secondary" aria-hidden="true" />
        <blockquote className="text-base leading-relaxed text-foreground md:text-center md:text-xl">“{SMOOT_QUOTE}”</blockquote>
        <figcaption className="mt-6 text-center text-sm"><span className="font-semibold text-primary">Leonard Smoot</span><br /><span className="text-muted-foreground">President, Black College Golf Coaches Association</span></figcaption>
      </figure>}

      <div className="mx-auto max-w-3xl text-center">
        <h2 id="trust-proof-title" className="font-display text-3xl font-bold text-primary md:text-4xl">About TeeVents</h2>
        <p className="mt-5 leading-relaxed text-muted-foreground">TeeVents was founded by Rod Jackson, a tournament director since 2018. We run at least 10 events a year, including NCAA-sanctioned HBCU college golf tournaments (SWAC, MEAC, SIAC; Division I and II) and celebrity fundraising events. TeeVents serves organizers nationwide.</p>
      </div>

      <div>
        <h3 className="mb-6 text-center font-display text-2xl font-bold text-primary">How It Works</h3>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => <li key={title} className="rounded-lg border border-border bg-card p-5">
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-secondary font-bold text-primary">{i + 1}</span>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>)}
        </ol>
      </div>

      <div className="mx-auto max-w-3xl">
        <h3 className="mb-4 text-center font-display text-2xl font-bold text-primary">Quick Answers</h3>
        <Accordion type="single" collapsible>
          {faqs.map(([q, a], i) => <AccordionItem key={q} value={`trust-faq-${i}`}><AccordionTrigger className="text-left font-semibold">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </div>
    </div>
  </section>;
}
