import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqSections = [
  {
    title: "General",
    items: [
      {
        q: "What is TeeVents.golf?",
        a: "TeeVents is a complete golf tournament management platform that lets you build a custom branded event website, handle registrations & payments, live scoring, pairings, budget tracking, and more — with optional white-glove consulting services.",
      },
      {
        q: "How do I create my first tournament?",
        a: "After purchasing a Starter or Pro plan, simply complete the quick onboarding (organization name + template), then use the guided dashboard to set up your event in minutes.",
      },
      {
        q: "Who is this built for?",
        a: "Nonprofit organizations, corporations, charity golf outings, corporate events, and any group running golf tournaments.",
      },
    ],
  },
  {
    title: "Registration & Features",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "Credit cards, Apple Pay, Google Pay, and more — all processed securely through Stripe.",
      },
      {
        q: "Can I accept group registrations (foursomes, etc.)?",
        a: "Yes — flexible group sizes from 1–6 players are fully supported with one checkout.",
      },
      {
        q: "How does live scoring and leaderboards work?",
        a: "Players or volunteers enter scores via mobile; results update instantly on the public leaderboard.",
      },
      {
        q: "What if it rains or the event is postponed?",
        a: "You control the rain policy in settings. We support rescheduling, refunds, or transfers — full flexibility for organizers.",
      },
    ],
  },
  {
    title: "Payments & Fees",
    items: [
      {
        q: "How does payment processing work?",
        a: "All funds are collected securely into TeeVents' business Stripe account (we act as the merchant of record). We handle everything so organizers never need their own Stripe account.",
      },
      {
        q: "Who pays the payment processing fees?",
        a: 'By default (toggle ON), fees are passed on to participants at checkout so your organization receives the full advertised price. You can turn the toggle OFF in tournament settings to absorb the fees yourself — participants then pay exactly the advertised price, and fees are deducted from your bi-weekly payout.',
      },
      {
        q: "What are the payment processing fees?",
        a: "Fees consist of standard Stripe processing costs (typically ~2.9% + $0.30 per transaction) plus our platform fee. Exact amounts are shown at checkout when the \"pass fees\" toggle is ON.",
      },
      {
        q: "When and how often does my organization get paid?",
        a: "Net funds (after fees and any reserve) are automatically paid out to your organization's bank account every two weeks. You can view next payout date and history in the Finances dashboard.",
      },
      {
        q: "Can I get my money faster?",
        a: "Bi-weekly is standard for security and fraud protection. Contact support for large events if you need a custom schedule.",
      },
      {
        q: "What is your refund policy?",
        a: "Refunds are managed by the tournament organizer. You set the policy per event (e.g., full refund up to X days before the event). All refunds are processed through our platform.",
      },
      {
        q: "Are there any hidden fees?",
        a: "No. All fees are transparent and shown upfront. There are no monthly subscription fees beyond your chosen Starter/Pro plan.",
      },
    ],
  },
  {
    title: "Payouts & Finances",
    items: [
      {
        q: "How do I set up my organization's payout bank account?",
        a: "Go to Settings → Payouts and enter your bank details once. Future payouts are automatic.",
      },
      {
        q: "Can I track my event budget and sponsor money?",
        a: "Yes — the full Budget & Finances dashboard shows real-time income, expenses, held funds, and next payout.",
      },
    ],
  },
  {
    title: "Security & Support",
    items: [
      {
        q: "Is my data and money secure?",
        a: "Yes — we use enterprise-grade Stripe security, and follow all PCI compliance standards. Funds are held safely until payout.",
      },
      {
        q: "What if I need help?",
        a: "Use the in-app chat, email support@teevents.golf, or book a call. White-glove consulting is also available.",
      },
      {
        q: "Can I cancel my plan?",
        a: "Yes — cancel anytime with no long-term contracts. Existing events remain accessible.",
      },
      {
        q: "Do you support handicap systems or golf-specific formats?",
        a: "Yes — full support for scrambles, stroke play, flighting, contests (closest-to-pin, longest drive), mulligans, and more.",
      },
    ],
  },
];

const FAQ = () => {
  return (
    <Layout>
      <SEO
        title="FAQ | TeeVents — Frequently Asked Questions"
        description="Get answers to common questions about TeeVents golf tournament management, payments, fees, payouts, and support."
        path="/faq"
      />

      <section className="bg-primary pt-24 pb-16">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <HelpCircle className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
              Everything you need to know about TeeVents.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {faqSections.map((section, sIdx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.1 }}
              className="mb-10"
            >
              <h2 className="text-xl font-display font-bold text-foreground mb-4 border-b border-border pb-2">
                {section.title}
              </h2>
              <Accordion type="multiple" className="space-y-2">
                {section.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${sIdx}-${idx}`}
                    className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                  >
                    <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
