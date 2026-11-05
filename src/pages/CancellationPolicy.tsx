import Layout from "@/components/Layout";
import { SOFTWARE_TAG, MANAGED_TAG } from "@/lib/programTypes";

export default function CancellationPolicy() {
  return <Layout>
    <section className="bg-primary py-16 text-center text-primary-foreground md:py-20">
      <div className="container mx-auto max-w-4xl px-4">
        <h1 className="font-display text-4xl font-bold md:text-5xl">Cancellation Policy</h1>
      </div>
    </section>
    <article className="container mx-auto max-w-3xl space-y-10 px-4 py-12 md:py-16">
      <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
        This page covers cancellation for TeeVents platform plans, and for in person tournament management services, including Full Service Management. Please read the section that applies to your purchase, and contact us if you have questions before you cancel.
      </p>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Platform plans</h2>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{SOFTWARE_TAG} — No Cost to Start, Per Event, Per League, Enterprise</p>
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
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Full Service Management</h2>
        <p className="text-xs font-bold text-primary">{MANAGED_TAG}</p>
        <p className="text-lg font-semibold">Contact us for a quote</p>
        <p className="text-lg leading-relaxed text-foreground/85">Everything in the software, plus a dedicated tournament manager who works with you from agreement through event day, on site.</p>
        <p className="text-lg leading-relaxed text-foreground/85">Management terms are quoted individually after the meeting, in a written proposal.</p>
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
          Full Service Management postponement terms are quoted individually after the meeting, in a written proposal.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">How to cancel</h2>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          To cancel, send a written cancellation notice to info@teevents.golf, with your event name, event date, and the name of the person authorized to cancel for the organizer.
        </p>
        <p className="text-lg leading-relaxed text-foreground/85 [overflow-wrap:normal]">
          The cancellation date is the date TeeVents receives that written notice. Full Service Management cancellation terms are provided in the individual written proposal.
        </p>
        <p className="text-lg leading-relaxed">
          <a href="mailto:info@teevents.golf" className="text-primary underline underline-offset-4">Contact us</a>
        </p>
      </section>
    </article>
  </Layout>;
}
