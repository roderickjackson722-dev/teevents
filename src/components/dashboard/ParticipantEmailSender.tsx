import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail } from "lucide-react";

interface Registrant {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface Props {
  tournamentId: string;
  tournamentTitle: string;
}

export function ParticipantEmailSender({ tournamentId, tournamentTitle }: Props) {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Registrant[]>([]);
  const [mode, setMode] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from("tournament_registrations")
      .select("id, first_name, last_name, email")
      .eq("tournament_id", tournamentId)
      .order("last_name", { ascending: true })
      .then(({ data }) => setPlayers((data || []) as Registrant[]));
  }, [tournamentId]);

  const withEmail = players.filter((p) => p.email);
  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const send = async () => {
    const recipientIds = mode === "all" ? undefined : Array.from(selected);
    if (mode === "select" && (!recipientIds || recipientIds.length === 0)) {
      toast({ title: "Select at least one player", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-tournament-email", {
        body: { tournament_id: tournamentId, recipient_ids: recipientIds, subject, message },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      toast({ title: `Email sent to ${sent} recipient${sent === 1 ? "" : "s"}` });
      setSubject("");
      setMessage("");
      setSelected(new Set());
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 space-y-4 border-t">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-secondary" />
        <p className="font-semibold text-foreground">Send Email to Participants</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Send a one-time message to all registered players or a hand-picked group. Rate limited to 100
        emails per hour per tournament.
      </p>

      <div className="space-y-2">
        <Label className="text-xs">Send to</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "all" | "select")}>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="all" id="rcp-all" />
            <Label htmlFor="rcp-all" className="font-normal cursor-pointer">
              All registered players ({withEmail.length})
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="select" id="rcp-select" />
            <Label htmlFor="rcp-select" className="font-normal cursor-pointer">
              Select individual players
            </Label>
          </div>
        </RadioGroup>
      </div>

      {mode === "select" && (
        <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-1 bg-muted/20">
          {withEmail.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No registered players with an email on file yet.</p>
          ) : (
            withEmail.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 px-2 py-1 rounded">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <span className="flex-1">
                  {p.first_name} {p.last_name} <span className="text-muted-foreground">({p.email})</span>
                </span>
              </label>
            ))
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Subject</Label>
        <Input
          placeholder={`${tournamentTitle} – Important Update`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Message</Label>
        <Textarea
          rows={6}
          placeholder="Type your message here. Players will receive it from the tournament organizer."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSubject("");
            setMessage("");
            setSelected(new Set());
          }}
          disabled={sending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={send}
          disabled={sending}
          className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Send Email
        </Button>
      </div>
    </Card>
  );
}
