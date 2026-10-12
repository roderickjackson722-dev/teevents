import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Send, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Msg = { id: string; user_id: string; organization_id: string | null; user_email: string | null; role: string; sender_type: string | null; content: string; needs_human: boolean; created_at: string };
type Ticket = { id: string; user_id: string; user_email: string | null; question: string; status: string; created_at: string };

export default function HelpChats() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const selected = params.get("user");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([
      supabase.from("help_chat_messages").select("*").order("created_at", { ascending: true }).limit(5000),
      supabase.from("help_tickets").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (m.error || t.error) { toast.error("Could not load support chats."); return; }
    setMsgs(m.data || []);
    setTickets(t.data || []);
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(() => { void load(); }, 5000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => { setReply(""); replyRef.current?.focus(); }, [selected]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length, selected]);

  const organizers = useMemo(() => {
    const map = new Map<string, { email: string; last: string; count: number; open: number }>();
    for (const m of msgs) {
      const e = map.get(m.user_id) || { email: m.user_email || "Unknown", last: m.created_at, count: 0, open: 0 };
      e.count++; e.last = m.created_at; map.set(m.user_id, e);
    }
    for (const t of tickets) { const organizer = map.get(t.user_id); if (t.status === "open" && organizer) organizer.open++; }
    return [...map.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last));
  }, [msgs, tickets]);

  const resolve = async (id: string) => {
    const { error } = await supabase.from("help_tickets").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ticket marked resolved");
    load();
  };

  const chat = msgs.filter((m) => m.user_id === selected);
  const userTickets = tickets.filter((t) => t.user_id === selected);
  const sendReply = async () => {
    if (!selected || !reply.trim() || sending) return;
    const targetUser = selected;
    const content = reply.trim();
    setSending(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in again.");
      const orgId = chat.find(m => m.organization_id)?.organization_id || params.get("org");
      if (!orgId) throw new Error("This organizer has no organization attached to their chat.");
      const { error } = await supabase.from("help_chat_messages").insert({
        user_id: targetUser, organization_id: orgId, user_email: chat[0]?.user_email || null,
        role: "assistant", sender_type: "team", sender_user_id: user.id, content, needs_human: true,
      });
      if (error) throw error;
      setReply("");
      await load();
      replyRef.current?.focus();
      toast.success("Reply sent to the organizer's chat.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send your reply."); }
    finally { setSending(false); }
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
      <h1 className="text-2xl font-bold">Organizer Help Chats &amp; Tickets</h1>
      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Organizers</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-2">
            {organizers.length === 0 && <p className="text-sm text-muted-foreground p-2">No chats yet.</p>}
            {organizers.map(([uid, o]) => (
              <Button variant="ghost" key={uid} onClick={() => setParams({ user: uid })}
                className={`h-auto w-full justify-start whitespace-normal text-left rounded-md p-2 text-sm hover:bg-muted ${selected === uid ? "bg-muted" : ""}`}><span className="min-w-0 w-full">
                <div className="font-medium truncate">{o.email}</div>
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  {new Date(o.last).toLocaleString()} · {o.count} msgs
                  {o.open > 0 && <Badge variant="destructive" className="text-[10px]">{o.open} open</Badge>}
                </div>
              </span></Button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-4">
            {!selected && <p className="text-sm text-muted-foreground">Select an organizer to view the full chat.</p>}
            {userTickets.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Tickets</h3>
                {userTickets.map((t) => (
                  <div key={t.id} className="border rounded-md p-2 text-sm flex justify-between gap-2">
                    <div>
                      <Badge variant={t.status === "open" ? "destructive" : "secondary"} className="mr-2">{t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                      <p className="mt-1 whitespace-pre-wrap">{t.question}</p>
                    </div>
                    {t.status === "open" && <Button size="sm" variant="outline" onClick={() => resolve(t.id)}><CheckCircle2 className="h-4 w-4 mr-1" /> Resolve</Button>}
                  </div>
                ))}
              </div>
            )}
            {selected && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Full chat</h3>
                <div role="log" aria-label="Organizer conversation" className="max-h-[560px] overflow-y-auto space-y-3">
                {chat.map((m) => (
                  <div key={m.id} className={`rounded-md p-2 text-sm ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {m.role === "user" ? "Organizer" : m.sender_type === "team" ? "TeeVents team" : "AI"} · {new Date(m.created_at).toLocaleString()}
                      {m.needs_human && <Badge variant="outline" className="ml-2 text-[10px]">Sent to team</Badge>}
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
                <div ref={endRef} /></div>
                <form onSubmit={e => { e.preventDefault(); void sendReply(); }} className="border-t border-border pt-4 space-y-2">
                  <label htmlFor="support-reply" className="text-sm font-semibold">Reply to organizer</label>
                  <Textarea ref={replyRef} id="support-reply" value={reply} maxLength={4000} onChange={e => setReply(e.target.value)} placeholder="Write your reply..." rows={3} disabled={sending} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendReply(); } }} />
                  <div className="flex justify-end"><Button type="submit" disabled={sending || !reply.trim()}><>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Reply</></Button></div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
