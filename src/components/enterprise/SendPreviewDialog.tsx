import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarClock, Loader2, Send } from "lucide-react";
import type { PreviewRecipient } from "@/lib/sendPreview";

export type SendPreviewProps = {
  open: boolean;
  title: string;
  recipients: PreviewRecipient[];
  /** Registrations the organizer can pick to see filled-in content. */
  sampleOptions?: { id: string; label: string }[];
  /** Renders content for the chosen sample id. */
  renderContent: (sampleId: string | null) => ReactNode;
  /** Present for scheduled sends. */
  scheduledFor?: string | null;
  notices?: string[];
  action: "send" | "schedule";
  actionLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  onBack: () => void;
  onConfirm: () => void | Promise<void>;
};

/** Preview step for Enterprise sends: the only place Send or Schedule appears. */
export default function SendPreviewDialog(p: SendPreviewProps) {
  const [sampleId, setSampleId] = useState<string | null>(null);
  useEffect(() => {
    if (p.open) setSampleId(p.sampleOptions?.[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.open]);
  const effectiveSample = p.sampleOptions?.some((o) => o.id === sampleId) ? sampleId : p.sampleOptions?.[0]?.id ?? null;
  const deliverable = p.recipients.filter((r) => r.address).length;

  return (
    <Dialog open={p.open} onOpenChange={(o) => { if (!o) p.onBack(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview: {p.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {p.scheduledFor !== undefined && (
            <div className="rounded-lg border border-secondary bg-secondary/10 p-3">
              <p className="flex items-center gap-2 font-medium text-foreground"><CalendarClock className="h-4 w-4" /> Planned send time: {p.scheduledFor || "Not set"}</p>
              <p className="mt-1 text-muted-foreground">May change by send time. This shows the content and recipients as they look now.</p>
            </div>
          )}
          {p.notices?.map((n) => <p key={n} className="rounded-md border bg-muted/40 p-2 text-muted-foreground">{n}</p>)}

          <div>
            <p className="mb-1 font-medium text-foreground">Recipients ({deliverable})</p>
            <div className="max-h-40 divide-y overflow-y-auto rounded border">
              {p.recipients.length === 0 ? <p className="p-2 text-muted-foreground">No recipients.</p> : p.recipients.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5">
                  <span className="text-foreground">{r.name}</span>
                  <span className="text-muted-foreground">{r.address || "-"}</span>
                  {r.note && <Badge variant="outline" className="text-xs">{r.note}</Badge>}
                </div>
              ))}
            </div>
          </div>

          {p.sampleOptions && p.sampleOptions.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-foreground">Show content for</p>
              <Select key={`${p.sampleOptions.length}-${p.sampleOptions[0]?.id}`} value={effectiveSample ?? undefined} onValueChange={setSampleId}>
                <SelectTrigger aria-label="Preview recipient"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {p.sampleOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>{p.renderContent(effectiveSample)}</div>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={p.onBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to edit</Button>
            <Button onClick={() => p.onConfirm()} disabled={p.busy || p.disabled || deliverable === 0} className="bg-secondary text-primary hover:bg-secondary/90">
              {p.busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : p.action === "schedule" ? <CalendarClock className="mr-1.5 h-4 w-4" /> : <Send className="mr-1.5 h-4 w-4" />}
              {p.actionLabel || (p.action === "schedule" ? "Schedule" : "Send")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
