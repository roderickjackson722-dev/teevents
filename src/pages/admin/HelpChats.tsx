import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Msg = { id: string; user_id: string; user_email: string | null; role: string; content: string; needs_human: boolean; created_at: string };
type Ticket = { id: string; user_id: string; user_email: string | null; question: string; status: string; created_at: string };

export default function HelpChats() {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    const [m, t] = await Promise.all([
      supabase.from("help_chat_messages").select("*").order("created_at", { ascending: true }).limit(5000),
      supabase.from("help_tickets").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setMsgs((m.data as any) || []);
    setTickets((t.data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const organizers = useMemo(() => {
    const map = new Map<string, { email: string; last: string; count: number; open: number }>();
    for (const m of msgs) {
      const e = map.get(m.user_id) || { email: m.user_email || "Unknown", last: m.created_at, count: 0, open: 0 };
      e.count++; e.last = m.created_at; map.set(m.user_id, e);
    }
    for (const t of tickets) if (t.status === "open" && map.has(t.user_id)) map.get(t.user_id)!.open++;
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

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Button>
      <h1 className="text-2xl font-bold">Organizer Help Chats &amp; Tickets</h1>
      <p className="text-sm text-muted-foreground">Every organizer help chat, with tickets that were sent to the team. New tickets are emailed to info@teevents.golf, plus a daily summary of all chats.</p>
      <div className="grid md:grid-cols-[300px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Organizers</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-2">
            {organizers.length === 0 && <p className="text-sm text-muted-foreground p-2">No chats yet.</p>}
            {organizers.map(([uid, o]) => (
              <button key={uid} onClick={() => setSelected(uid)}
                className={`w-full text-left rounded-md p-2 text-sm hover:bg-muted ${selected === uid ? "bg-muted" : ""}`}>
                <div className="font-medium truncate">{o.email}</div>
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  {new Date(o.last).toLocaleString()} · {o.count} msgs
                  {o.open > 0 && <Badge variant="destructive" className="text-[10px]">{o.open} open</Badge>}
                </div>
              </button>
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
                {chat.map((m) => (
                  <div key={m.id} className={`rounded-md p-2 text-sm ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {m.role === "user" ? "Organizer" : "AI"} · {new Date(m.created_at).toLocaleString()}
                      {m.needs_human && <Badge variant="outline" className="ml-2 text-[10px]">Sent to team</Badge>}
                    </div>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
