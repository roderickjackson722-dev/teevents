import { FileText } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Private admin page holding the draft Transition Assistance Plan for the
 * Arlington County solicitation (IFB-127128 / N1487). "Save as PDF" uses the
 * browser print dialog so the page can be submitted as-is.
 */
export default function TransitionPlan() {
  return (
    <RfpAdminGate
      title="Transition Assistance Plan"
      subtitle="Draft data-export and knowledge-transfer plan for contract close-out. Print to PDF for submission."
    >
      <div className="print:hidden">
        <Button onClick={() => window.print()}>
          <FileText className="h-4 w-4 mr-2" /> Save as PDF
        </Button>
      </div>

      <Card className="p-6 md:p-10 space-y-6 text-sm leading-relaxed text-foreground">
        <header className="space-y-1 border-b border-border pb-4">
          <h2 className="text-xl font-bold">Transition Assistance Plan</h2>
          <p className="text-muted-foreground">
            TeeVents — Recreation Program Registration &amp; Scheduling Platform<br />
            Solicitation IFB-127128 / N1487 · Arlington County, Virginia
          </p>
        </header>

        <section className="space-y-2">
          <h3 className="font-semibold">1. Purpose</h3>
          <p>
            This plan describes how TeeVents will return all County data and transfer operational
            knowledge at the end of the contract term, at contract termination, or at the County's
            request, so that program registration, scheduling, and financial operations continue
            without interruption.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">2. Data Ownership</h3>
          <p>
            All participant, registration, roster, scheduling, sponsorship, and financial records
            created under this contract remain the exclusive property of Arlington County. TeeVents
            claims no license to retain, resell, or reuse County data after transition, and will
            certify destruction of remaining copies within 30 days of final handover acceptance.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">3. Data Export Formats</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>CSV</strong> — one file per record set (participants, registrations, payments, rosters, teams, standings, facilities, bookings, sponsorships, donations) with a documented header row.</li>
            <li><strong>JSON</strong> — full relational export preserving record identifiers and parent/child relationships for direct import into a successor system.</li>
            <li><strong>SQL</strong> — PostgreSQL logical dump (schema plus data) for a like-for-like restore.</li>
            <li><strong>PDF</strong> — point-in-time financial and program reports (GAAP/GASB category summaries) for audit retention.</li>
            <li><strong>Documents and media</strong> — original uploaded files (waivers, logos, hero images, attachments) delivered in original format with a manifest.</li>
          </ul>
          <p>
            Exports include a data dictionary describing every table, field, data type, and code
            value, plus record counts and checksums so the County can validate completeness.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">4. Knowledge Transfer Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-border">
              <thead className="bg-muted/50">
                <tr><th className="p-2 border-b border-border">Phase</th><th className="p-2 border-b border-border">Activity</th><th className="p-2 border-b border-border">Timing</th></tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b border-border">Kickoff</td><td className="p-2 border-b border-border">Transition kickoff meeting; confirm County transition lead, scope, and acceptance criteria</td><td className="p-2 border-b border-border">Within 5 business days of notice</td></tr>
                <tr><td className="p-2 border-b border-border">Documentation</td><td className="p-2 border-b border-border">Deliver data dictionary, integration inventory, configuration and workflow documentation</td><td className="p-2 border-b border-border">Day 6–15</td></tr>
                <tr><td className="p-2 border-b border-border">Test export</td><td className="p-2 border-b border-border">Provide full sample export (CSV, JSON, SQL) for County validation</td><td className="p-2 border-b border-border">Day 16–30</td></tr>
                <tr><td className="p-2 border-b border-border">Training</td><td className="p-2 border-b border-border">Up to four (4) working sessions with County staff and/or successor vendor, recorded</td><td className="p-2 border-b border-border">Day 31–45</td></tr>
                <tr><td className="p-2 border-b border-border">Final export</td><td className="p-2 border-b border-border">Production cut-over export with checksums and reconciliation report</td><td className="p-2 border-b border-border">Day 46–55</td></tr>
                <tr><td className="p-2">Close-out</td><td className="p-2">County acceptance sign-off; certified deletion of residual data</td><td className="p-2">Day 56–60</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">5. Timeline for Handover</h3>
          <p>
            Standard transition is completed within sixty (60) calendar days of written notice.
            TeeVents will continue normal platform operation, support, and payment processing
            throughout the transition period at no additional cost, and will honor a County request
            for up to thirty (30) additional days of read-only access after cut-over.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">6. Point of Contact for Transition</h3>
          <p>
            Transition Manager, TeeVents<br />
            Email: info@teevents.golf<br />
            Escalation: same-business-day acknowledgement, resolution plan within two business days.
          </p>
          <p>
            The County's designated transition lead will receive a single point of accountability
            for all export deliverables, training sessions, and acceptance documentation.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">7. Security During Transition</h3>
          <p>
            Exports are delivered over an encrypted channel (TLS 1.2+) to a County-designated
            destination, with credentials shared out-of-band. Payment card data is never exported:
            only tokenized references and settlement totals are included, consistent with PCI DSS
            obligations. Access to transition artifacts is limited to named personnel and logged.
          </p>
        </section>

        <footer className="pt-4 border-t border-border text-xs text-muted-foreground">
          Draft for internal review — prepared for submission by September 8, 2026.
        </footer>
      </Card>
    </RfpAdminGate>
  );
}
