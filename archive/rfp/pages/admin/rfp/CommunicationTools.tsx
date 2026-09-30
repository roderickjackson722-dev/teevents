import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
import RfpAdminGate from "@/components/admin/RfpAdminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  deleteRfpCommunication,
  listRfpCommunications,
  sendRfpCommunication,
} from "@/lib/rfpPrograms.functions";

export default function RfpCommunicationTools() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<any>({ messages: [], seasons: [], teams: [] });
  const [draft, setDraft] = useState({
    season_id: "",
    team_id: "",
    recipient_type: "all",
    communication_type: "email",
    subject: "",
    message: "",
    scheduled_for: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      setData(await listRfpCommunications({ data: {} } as any));
    } catch (error: any) {
      toast.error(error?.message || "Could not load communications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const send = async () => {
    if (!draft.message.trim()) return toast.error("Write a message first");
    setSending(true);
    try {
      const result: any = await sendRfpCommunication({
        data: {
          season_id: draft.season_id || null,
          team_id: draft.recipient_type === "team" ? draft.team_id || null : null,
          recipient_type: draft.recipient_type,
          communication_type: draft.communication_type,
          subject: draft.subject || null,
          message: draft.message,
          scheduled_for: draft.scheduled_for ? new Date(draft.scheduled_for).toISOString() : null,
        },
      } as any);
      if (result.scheduled) toast.success(`Scheduled for ${result.recipients} recipients`);
      else toast.success(`Sent to ${result.sent} recipients${result.failed ? `, ${result.failed} failed` : ""}`);
      setDraft({ ...draft, subject: "", message: "", scheduled_for: "" });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not send the message");
    } finally {
      setSending(false);
    }
  };

  const seasonName = (id: string | null) => (data.seasons as any[]).find((s) => s.id === id)?.name || "All seasons";

  return (
    <RfpAdminGate title="Communication Tools" subtitle="Private bulk email and text messaging for county program participants, coaches and families.">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-foreground">Compose message</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1"><Label>Season</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.season_id} onChange={(e) => setDraft({ ...draft, season_id: e.target.value, team_id: "" })}>
                  <option value="">All seasons</option>{(data.seasons as any[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Recipients</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.recipient_type} onChange={(e) => setDraft({ ...draft, recipient_type: e.target.value })}>
                  <option value="all">Everyone registered</option>
                  <option value="players">Players</option>
                  <option value="parents">Parents</option>
                  <option value="coaches">Coaches</option>
                  <option value="team">One team</option>
                </select>
              </div>
              {draft.recipient_type === "team" && (
                <div className="space-y-1"><Label>Team</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.team_id} onChange={(e) => setDraft({ ...draft, team_id: e.target.value })}>
                    <option value="">Select team</option>
                    {(data.teams as any[]).filter((t) => !draft.season_id || t.season_id === draft.season_id).map((t) => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1"><Label>Send by</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.communication_type} onChange={(e) => setDraft({ ...draft, communication_type: e.target.value })}>
                  <option value="email">Email</option><option value="sms">Text message</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Send later (optional)</Label><Input type="datetime-local" value={draft.scheduled_for} onChange={(e) => setDraft({ ...draft, scheduled_for: e.target.value })} /></div>
            </div>
            {draft.communication_type === "email" && (
              <div className="space-y-1"><Label>Subject</Label><Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} maxLength={200} /></div>
            )}
            <div className="space-y-1"><Label>Message</Label><Textarea rows={6} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} maxLength={5000} /></div>
            <Button onClick={() => void send()} disabled={sending}><Send className="h-4 w-4" />{sending ? "Sending" : draft.scheduled_for ? "Schedule message" : "Send now"}</Button>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">History</h2>
              <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button>
            </div>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Season</TableHead><TableHead>To</TableHead><TableHead>Type</TableHead><TableHead>Subject / message</TableHead><TableHead>Status</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(data.messages as any[]).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.sent_at || m.scheduled_for || m.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{seasonName(m.season_id)}</TableCell>
                    <TableCell className="text-sm">{m.recipient_type} ({m.recipient_count})</TableCell>
                    <TableCell className="text-sm">{m.communication_type}</TableCell>
                    <TableCell className="text-sm max-w-72 truncate">{m.subject ? `${m.subject} — ` : ""}{m.message}</TableCell>
                    <TableCell className="text-sm">{m.status}{m.error_message ? <div className="text-xs text-destructive">{m.error_message}</div> : null}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={async () => { await deleteRfpCommunication({ data: { id: m.id } } as any); await load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data.messages as any[]).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No messages sent yet.</TableCell></TableRow>}
              </TableBody>
            </Table></div>
          </Card>
        </div>
      )}
    </RfpAdminGate>
  );
}
