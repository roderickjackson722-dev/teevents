import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Handshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { enterpriseRepRequestSchema } from "@/lib/enterpriseRepRequest.schema";
import { submitEnterpriseRepRequest } from "@/lib/enterpriseRepRequest.functions";

export default function EnterpriseRepSetupCard({ organizationId }: { organizationId?: string }) {
  const submitRequest = useServerFn(submitEnterpriseRepRequest);
  const [open, setOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const parsed = enterpriseRepRequestSchema.safeParse({ organizationId, eventName, date, message });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check your request details."); return; }
    setError("");
    setBusy(true);
    try {
      const result = await submitRequest({ data: parsed.data });
      if (!result.ticketId) throw new Error("Could not submit your request. Please try again.");
      setReceived(true);
      setEventName(""); setDate(""); setMessage("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not submit your request. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <section aria-labelledby="rep-setup-heading" className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Handshake aria-hidden="true" className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="rep-setup-heading" className="font-display text-xl font-semibold text-primary">Your dedicated TeeVents rep</h2>
          <p className="mt-2 text-sm text-muted-foreground">A dedicated TeeVents rep sets up your events for you. Request rep setup below and your rep will confirm next steps.</p>
        </div>
        <Button disabled={!organizationId} className="shrink-0 bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={() => { setReceived(false); setError(""); setOpen(true); }}>Request rep setup</Button>
      </section>
      <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-md">
          <DialogHeader>
            <DialogTitle>Request rep setup</DialogTitle>
            <DialogDescription>Your dedicated TeeVents rep</DialogDescription>
          </DialogHeader>
          {received ? (
            <div role="status" className="flex items-start gap-3 py-4 text-foreground"><CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" /><p>Rep request received. Your rep will confirm next steps.</p></div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="rep-event-name">Event name</Label><Input id="rep-event-name" value={eventName} onChange={(event) => setEventName(event.target.value)} required maxLength={200} disabled={busy} /></div>
              <div className="space-y-2"><Label htmlFor="rep-event-date">Date if known</Label><Input id="rep-event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={busy} /></div>
              <div className="space-y-2"><Label htmlFor="rep-message">Message</Label><Textarea id="rep-message" value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={3000} rows={5} disabled={busy} /></div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end"><Button type="submit" disabled={busy || !organizationId} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">{busy && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}Submit request</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}