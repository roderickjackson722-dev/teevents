import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SendPreviewDialog from "@/components/enterprise/SendPreviewDialog";
import { personalizeSms, smsRecipients, smsSegments } from "@/lib/sendPreview";

type Props = {
  open: boolean;
  message: string;
  mode: "now" | "schedule";
  scheduledFor: Date | null;
  audience: "registered" | "manual";
  manualNumbers: string[];
  creditsRemaining: number;
  registrations?: any[];
  tournament?: any;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
  testNumber: string;
  onTestNumberChange: (v: string) => void;
  onSendTest: () => void;
  testBusy: boolean;
};

/** Read-only text message preview: recipients, exact text, characters and message parts. */
export default function SmsSendPreview(p: Props) {
  const regs = p.registrations ?? [];
  const { recipients, skippedForCredits, manualIgnored } = smsRecipients({
    mode: p.mode, audience: p.audience, registrations: regs, manualNumbers: p.manualNumbers, creditsRemaining: p.creditsRemaining,
  });
  const scheduled = p.mode === "schedule";
  const personalized = !scheduled && p.audience === "registered";
  const notices: string[] = [];
  if (!p.registrations) notices.push("Loading recipients…");
  if (skippedForCredits > 0) notices.push(`${skippedForCredits} player(s) will be skipped because your plan has ${p.creditsRemaining} text(s) left.`);
  if (manualIgnored) notices.push("Scheduled texts go to registered players with a phone number. The numbers you typed are not used.");
  if (scheduled && /\{\{\s*\w+\s*\}\}/.test(p.message)) notices.push("Scheduled texts go out word for word. Fill-ins like {{first_name}} are not replaced.");
  if (!personalized && !scheduled) notices.push("Texts to typed numbers fill in First name as \"Manual\" and Last name as the number.");

  const sampleOptions = personalized ? recipients.map((r) => ({ id: r.id, label: `${r.name} (${r.address})` })) : undefined;

  return (
    <SendPreviewDialog
      open={p.open}
      title={scheduled ? "Scheduled text message" : "Text message"}
      recipients={recipients}
      sampleOptions={sampleOptions}
      scheduledFor={scheduled ? (p.scheduledFor ? format(p.scheduledFor, "EEE, MMM d, yyyy 'at' h:mm a") : null) : undefined}
      notices={notices}
      action={scheduled ? "schedule" : "send"}
      busy={p.busy}
      disabled={!p.registrations}
      onBack={p.onBack}
      onConfirm={p.onConfirm}
      renderContent={(sampleId) => {
        let text = p.message;
        if (personalized) {
          const reg = regs.find((r) => r.id === sampleId) ?? regs.find((r) => r.id === recipients[0]?.id);
          if (reg) text = personalizeSms(p.message, reg, p.tournament);
        } else if (!scheduled) {
          const num = p.manualNumbers[0] ?? "";
          text = personalizeSms(p.message, { first_name: "Manual", last_name: num, phone: num }, p.tournament);
        }
        const seg = smsSegments(text);
        const total = recipients.length;
        return (
          <div className="space-y-3">
            <p className="font-medium text-foreground">Text</p>
            <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-foreground">{text}</div>
            <p className="text-muted-foreground">
              {seg.characters} characters ({seg.encoding}) · {seg.segments} message part{seg.segments === 1 ? "" : "s"} per phone ·
              counts as {total} text message{total === 1 ? "" : "s"} on your plan (1 per recipient)
            </p>
            {!scheduled && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                <Input className="max-w-[200px]" placeholder="+14045551234" value={p.testNumber} onChange={(e) => p.onTestNumberChange(e.target.value)} aria-label="Test number" />
                <Button type="button" variant="outline" size="sm" disabled={!p.testNumber.trim() || p.testBusy} onClick={p.onSendTest}>
                  {p.testBusy ? "Sending..." : "Send test to this number"}
                </Button>
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
