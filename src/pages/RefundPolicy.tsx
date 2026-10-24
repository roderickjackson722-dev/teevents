import Layout from "@/components/Layout";

const paragraphs = [
  "Refund decisions for registrations belong to the event organizer, not TeeVents. To request a refund, contact the organizer of your event.",
  "When a registration is refunded, the golfer receives the registration amount from the organizer. TeeVents platform fees are non-refundable and stay with TeeVents. Payment processing fees are non-refundable and stay with Stripe.",
  "Per-Event, Per-League, Enterprise, and add-on purchases are non-refundable. If an event is postponed, the purchase moves to the new event date at no extra charge.",
  "If an event is cancelled, the organizer refunds registrations under the organizer's own refund policy. TeeVents fees and plan purchases are not refunded.",
  "If a golfer disputes a charge with their bank instead of requesting a refund, the dispute and any dispute fee are handled through the organizer's Stripe account.",
  "Once a refund is issued, it takes 5 to 10 business days to appear, depending on the golfer's bank.",
];

export default function RefundPolicy() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">TeeVents Refund Policy</h1>
      </div>
    </section>
    <article className="container mx-auto max-w-3xl space-y-7 px-4 py-12 md:py-16">
      {paragraphs.map(paragraph => <p key={paragraph} className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">{paragraph}</p>)}
    </article>
  </Layout>;
}