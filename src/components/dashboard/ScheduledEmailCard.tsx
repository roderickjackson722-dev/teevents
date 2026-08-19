import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CalendarClock, Loader2, Trash2, RefreshCw } from "lucide-react";

interface Props {
  tournamentId: string;
  /** Template being edited, e.g. "confirmation" | "day_before" | "tee_times". */
  templateKind: string;
  templateLabel: string;
  /** Registration ids currently checked in the Send tab. */
  selectedRecipients: string[];
  /** Total registrants with an email address (for the "everyone" label). */
  totalRecipients: number;
}

interface Job {
  id: string;
  template_kind: string;
  scheduled_for: string;
  recipient_count: number | null;
  recipient_ids: string[] | null;
  status: string;
  sent_at: string | null;
  sent_count: number | null;
  failed_count: number | null;
  error: string | null;
  note: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  sending: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  sent: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  canceled: "bg-muted text-muted-foreground hover:bg-muted",
};

/**
 * Lets organizers (and platform admins) prepare an email template and have it
 * delivered automatically at a future date and time.
 */
export default function ScheduledEmailCard({
  tournamentId,
  templateKind,
  templateLabel,
  selectedRecipients,
  totalRecipients,
}: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sendAt, setSendAt] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tournamentId) { setJobs([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_emails")
      .select("id, template_kind, scheduled_for, recipient_count, recipient_ids, status, sent_at, sent_count, failed_count, error, note")
      .eq("tournament_id", tournamentId)
      .order("scheduled_for", { ascending: true });
    setJobs((data || []) as unknown as Job[]);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const schedule = async () => {
    if (!tournamentId) { toast.error("Select a tournament first"); return; }
    if (!sendAt) { toast.error("Choose a send date and time"); return; }
    const when = new Date(sendAt);
    if (Number.isNaN(when.getTime())) { toast.error("That date and time isn't valid"); return; }
    if (when.getTime() < Date.now() - 60_000) { toast.error("Pick a time in the future"); return; }
    if (audience === "selected" && selectedRecipients.length === 0) {
      toast.error("Check at least one player in the list below");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await (supabase.from("scheduled_emails") as any).insert({
      tournament_id: tournamentId,
      template_kind: templateKind,
      scheduled_for: when.toISOString(),
      recipient_ids: audience === "selected" ? selectedRecipients : null,
      recipient_count: audience === "selected" ? selectedRecipients.length : totalRecipients,
      note: note.trim() || null,
      created_by: userRes?.user?.id || null,
      status: "scheduled",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Could not schedule this email");
      return;
    }
    toast.success(`${templateLabel} scheduled for ${when.toLocaleString()}`);
    setSendAt("");
    setNote("");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase.from("scheduled_emails") as any)
      .update({ status: "canceled" })
      .eq("id", id)
      .eq("status", "scheduled");
    if (error) toast.error("Could not cancel that send");
    else { toast.success("Scheduled send canceled"); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
    if (error) toast.error("Could not remove that entry");
    else load();
  };

  return (
    <div className="bg-card rounded-lg border p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Schedule This Email
        </h3>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Prepare the <span className="font-medium text-foreground">{templateLabel}</span> now and have it delivered
        automatically at the date and time you choose. Times use your device's time zone. The saved template content
        at the moment of sending is what goes out, so later edits are included.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Send Date &amp; Time</Label>
          <Input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Recipients</Label>
          <RadioGroup value={audience} onValueChange={(v) => setAudience(v as "all" | "selected")} className="mt-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="sched-all" />
              <Label htmlFor="sched-all" className="font-normal cursor-pointer text-sm">
                Everyone registered ({totalRecipients})
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="selected" id="sched-selected" />
              <Label htmlFor="sched-selected" className="font-normal cursor-pointer text-sm">
                Only the {selectedRecipients.length} player{selectedRecipients.length === 1 ? "" : "s"} I checked
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Internal Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Week-of reminder" className="mt-1" />
        </div>
      </div>

      <Button onClick={schedule} disabled={saving} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarClock className="h-4 w-4 mr-1" />}
        Schedule Email
      </Button>

      <div className="border-t pt-4 space-y-2">
        <Label className="text-sm font-semibold">Scheduled &amp; Sent</Label>
        {jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled for this event yet.</p>
        ) : (
          <div className="divide-y border rounded">
            {jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {new Date(j.scheduled_for).toLocaleString()}
                    {j.template_kind !== templateKind && (
                      <span className="text-muted-foreground font-normal"> · {j.template_kind.replace(/_/g, " ")}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {j.recipient_ids && j.recipient_ids.length > 0
                      ? `${j.recipient_ids.length} selected player(s)`
                      : "Everyone registered"}
                    {j.note ? ` · ${j.note}` : ""}
                    {j.status === "sent" ? ` · sent ${j.sent_count ?? 0}${j.failed_count ? `, ${j.failed_count} failed` : ""}` : ""}
                    {j.error ? ` · ${j.error}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${STATUS_STYLES[j.status] || ""}`} variant={j.status === "failed" ? "destructive" : "default"}>
                    {j.status}
                  </Badge>
                  {j.status === "scheduled" && (
                    <Button variant="outline" size="sm" onClick={() => cancel(j.id)}>Cancel</Button>
                  )}
                  {j.status !== "scheduled" && j.status !== "sending" && (
                    <Button variant="ghost" size="sm" onClick={() => remove(j.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
