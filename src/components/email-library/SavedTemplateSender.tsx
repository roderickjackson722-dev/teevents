import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { previewLibraryEmail, testLibraryEmail, sendSavedTemplateEmail } from "@/lib/emailLibrary.functions";
import { EmailPreview } from "./TemplateLibrary";

export default function SavedTemplateSender({ organizationId, eventId, template, registrations }: {
  organizationId: string; eventId: string; template: any; registrations: any[];
}) {
  const preview = useServerFn(previewLibraryEmail);
  const test = useServerFn(testLibraryEmail);
  const send = useServerFn(sendSavedTemplateEmail);
  const [out, setOut] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [result, setResult] = useState("");
  useEffect(() => { setOut(null); setSelected([]); setReview(false); setResult(""); }, [template.id, template.updated_at, eventId]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not complete this action."); }
    finally { setBusy(false); }
  };
  const eligible = registrations.filter(r => r.email);
  const chosen = eligible.filter(r => selected.includes(r.id));
  const templateData = { name: template.name, subject: template.subject, config: template.config, source_kind: template.source_kind };
  const showPreview = (forSend = false) => run(async () => {
    const output = await preview({ data: { organizationId, eventId, template: templateData, sampleRegistrationId: chosen[0]?.id } });
    setOut(output); setReview(forSend);
  });
  return <section className="space-y-5 min-w-0">
    <h2 className="text-lg font-semibold break-words">{template.name}</h2>
    <p className="text-sm break-words">Subject: {template.subject}</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => showPreview()}><Eye className="mr-2 h-4 w-4"/>Preview</Button></div>
    <div className="border-y py-4 space-y-2">
      <Label htmlFor="saved-template-test">Test email address</Label>
      <Input id="saved-template-test" type="email" value={recipient} onChange={e => setRecipient(e.target.value)} />
      <Button variant="outline" disabled={busy || !recipient.trim()} onClick={() => run(async () => {
        await test({ data: { organizationId, eventId, template: templateData, recipient, requestId: crypto.randomUUID() } });
        toast.success("One test email accepted for delivery.");
      })}><Send className="mr-2 h-4 w-4"/>Send Test Email</Button>
    </div>
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Recipients</h3><Button variant="outline" size="sm" disabled={busy || !eligible.length} onClick={() => setSelected(selected.length === eligible.length ? [] : eligible.map(r => r.id))}>{selected.length === eligible.length && eligible.length ? "Deselect All" : "Select All"}</Button></div>
    <div className="max-h-80 overflow-y-auto divide-y border-y">
      {!eligible.length && <p className="py-4 text-sm text-muted-foreground">No registrants with an email address.</p>}
      {eligible.map(r => <label key={r.id} className="flex items-center gap-3 py-3 cursor-pointer"><Checkbox disabled={busy} checked={selected.includes(r.id)} onCheckedChange={checked => setSelected(p => checked ? [...p, r.id] : p.filter(id => id !== r.id))}/><span className="min-w-0"><span className="block text-sm break-words">{r.first_name} {r.last_name}</span><span className="block text-xs text-muted-foreground break-all">{r.email}</span></span></label>)}
    </div>
    <Button disabled={busy || !chosen.length} onClick={() => showPreview(true)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4"/>}Review Send ({chosen.length})</Button>
    {result && <p role="status" className="text-sm">{result}</p>}
    <Dialog open={!!out} onOpenChange={open => { if (!open && !busy) { setOut(null); setReview(false); } }}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{review ? "Review Email Send" : "Template Preview"}</DialogTitle></DialogHeader>
      {out && <EmailPreview out={out}/>}
      {review && <><h3 className="font-semibold">{chosen.length} recipient(s)</h3><ul className="space-y-1 text-sm">{chosen.map(r => <li key={r.id} className="break-all">{r.first_name} {r.last_name} — {r.email}</li>)}</ul><Button disabled={busy} onClick={() => run(async () => {
        const sent = await send({ data: { organizationId, eventId, templateId: template.id, expectedUpdatedAt: template.updated_at, registrationIds: selected, requestId: crypto.randomUUID() } });
        setResult(`Sent ${sent.sent} email(s)${sent.failed ? `; ${sent.failed} failed` : ""}${sent.suppressed ? `; ${sent.suppressed} excluded by email preferences` : ""}.`);
        setOut(null); setReview(false); setSelected([]);
      })}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}Confirm Send</Button></>}
    </DialogContent></Dialog>
  </section>;
}