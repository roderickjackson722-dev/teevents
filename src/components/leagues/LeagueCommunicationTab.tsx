import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2 } from "lucide-react";

export default function LeagueCommunicationTab({ leagueId }: { leagueId: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  const load = async () => {
    const [{ data: msgs }, { count }] = await Promise.all([
      (supabase as any).from("league_messages").select("*").eq("league_id", leagueId).order("sent_at", { ascending: false }).limit(25),
      (supabase as any).from("league_members").select("id", { count: "exact", head: true }).eq("league_id", leagueId),
    ]);
    setHistory(msgs || []);
    setMemberCount(count || 0);
  };

  useEffect(() => { load(); }, [leagueId]);

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await (supabase as any).from("league_messages").insert({
        league_id: leagueId,
        subject: subject.trim(),
        body: body.trim(),
        sent_by: session?.user.id,
        recipient_count: memberCount,
      });
      if (error) throw error;
      // Attempt email delivery via edge function if it exists (safe fallback)
      try {
        await (supabase as any).functions.invoke("send-league-message", {
          body: { league_id: leagueId, subject, body },
        });
      } catch { /* optional */ }
      toast({ title: `Message queued for ${memberCount} member${memberCount === 1 ? "" : "s"}` });
      setSubject(""); setBody("");
      load();
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Message All Members ({memberCount})</h2>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Weekly update, event reminder, results…" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write an announcement, event reminder, or results update…" />
          </div>
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to Members
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Sent History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No messages sent yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((m) => (
                <div key={m.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="font-medium">{m.subject}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(m.sent_at).toLocaleString()} · {m.recipient_count || 0} recipients
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
