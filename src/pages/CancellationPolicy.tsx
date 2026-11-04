import Layout from "@/components/Layout";

export default function CancellationPolicy() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Cancellation Policy</h1>
      </div>
    </section>
    <article className="container mx-auto max-w-3xl space-y-10 px-4 py-12 md:py-16">
      <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
        This page covers cancellation for TeeVents platform plans, and for in person tournament management services, including Hybrid Managed. Please read the section that applies to your purchase, and contact us if you have questions before you cancel.
      </p>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Platform plans</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          TeeVents does not issue refunds directly to golfers. Refunds to golfers are at the organizer discretion, and are issued by the organizer.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          If a golfer registration is refunded, the 5% TeeVents platform fee stays with TeeVents. Stripe processing, at 2.9% plus $0.30, is also non refundable by Stripe policy, and the organizer absorbs it.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Per Event, Per League, Enterprise, and other plan and add on purchases are non refundable on cancellation. This includes the $399 Per Event purchase.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          No Cost to Start has no plan purchase to refund. The 5% platform fee paid by players at checkout on refunded registrations stays with TeeVents, as described above.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">In person tournament management services</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          In person management starts at $5,000 per event, plus travel quoted separately. The organizer is liable for the full management fee, even if event proceeds are low.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          If the event cancels, a work fee applies for work already done:
        </p>
        <ul className="list-disc space-y-2 pl-6 text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          <li>$1,500 after course negotiation and platform build</li>
          <li>$3,000 after registration launch and sponsor packet</li>
          <li>The full $5,000 within 30 days of the event</li>
        </ul>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Travel is quoted separately, on top of the management fee. Any travel costs already incurred are handled as agreed in the individual event agreement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Postponement, not cancellation</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          Postponement is different from cancellation.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          A postponed Per Event $399 purchase moves to the new date at no extra charge.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          A postponed Hybrid Managed event moves its management fee to the new date at no extra charge, for one postponement. A second postponement is treated as a cancellation, and the work fee schedule in Section 3 applies.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">How to cancel</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          To cancel, send a written cancellation notice to info@teevents.golf, with your event name, event date, and the name of the person authorized to cancel for the organizer.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          The cancellation date is the date TeeVents receives that written notice. Work fees are based on work already done by that date, using the schedules above.
        </p>
        <p className="text-lg leading-relaxed">
          <a href="mailto:info@teevents.golf" className="text-primary underline underline-offset-4">Contact us</a>
        </p>
      </section>
    </article>
  </Layout>;
}
