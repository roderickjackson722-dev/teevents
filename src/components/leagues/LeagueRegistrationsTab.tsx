import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Mail, Save, RotateCcw, Users, DollarSign, Send } from "lucide-react";

const DEFAULTS = {
  subject: "You're Registered — {{event_name}}",
  greeting: "Hi {{first_name}},",
  body_text:
    "You're all set for {{event_name}} with {{league_name}}.\n\n📅 Date: {{event_date}}\n📍 Course: {{course_name}}\n⏰ Tee Time: {{tee_time}}\n💵 Amount Paid: {{amount_paid}}\n🔑 Your Member Code: {{scoring_code}}",
  closing_text:
    "Please arrive 30 minutes before your tee time. You can enter scores during the round with your member code.",
  footer_text: "See you on the course! ⛳",
  header_bg_color: "#1a5c38",
  text_color: "#374151",
  button_text: "View My League Portal",
  show_button: true,
};

const VARIABLES = [
  "first_name", "member_name", "league_name", "event_name", "event_date",
  "course_name", "tee_time", "amount_paid", "scoring_code", "portal_url", "league_url",
];

const money = (c?: number | null) =>
  `$${(((c ?? 0) as number) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Row = {
  id: string;
  created_at: string;
  status: string | null;
  fee_paid: boolean | null;
  team_name: string | null;
  fee_tier_label: string | null;
  fee_tier_amount_cents: number | null;
  tee_time: string | null;
  pairing_group: number | null;
  pairing_position: number | null;
  confirmation_email_sent_at: string | null;
  member: { member_name: string; email: string | null; phone: string | null; handicap_index: number | null; scoring_code: string | null } | null;
};

export default function LeagueRegistrationsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [config, setConfig] = useState<typeof DEFAULTS>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: evs }, { data: lg }] = await Promise.all([
        (supabase as any).from("league_events").select("id, event_name, event_date").eq("league_id", leagueId).order("event_date"),
        (supabase as any).from("golf_leagues").select("event_confirmation_email_config").eq("id", leagueId).maybeSingle(),
      ]);
      setEvents(evs || []);
      if (evs?.[0]) setEventId(evs[0].id);
      setConfig({ ...DEFAULTS, ...((lg?.event_confirmation_email_config as any) || {}) });
      setLoading(false);
    })();
  }, [leagueId]);

  const load = async (evId: string) => {
    if (!evId) return setRows([]);
    setLoading(true);
    const { data } = await (supabase as any)
      .from("league_event_registrations")
      .select("id, created_at, status, fee_paid, team_name, fee_tier_label, fee_tier_amount_cents, tee_time, pairing_group, pairing_position, confirmation_email_sent_at, member:league_members(member_name, email, phone, handicap_index, scoring_code)")
      .eq("event_id", evId)
      .order("created_at", { ascending: true });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(eventId); /* eslint-disable-next-line */ }, [eventId]);

  const totals = useMemo(() => {
    const paid = rows.filter(r => r.fee_paid);
    return {
      count: rows.length,
      paid: paid.length,
      revenue: paid.reduce((s, r) => s + (r.fee_tier_amount_cents || 0), 0),
    };
  }, [rows]);

  const resend = async (regId: string) => {
    setSending(regId);
    try {
      const res = await fetch("/api/public/league-event-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: regId, force: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      toast({ title: "Confirmation sent" });
      await load(eventId);
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const sendAllMissing = async () => {
    const targets = rows.filter(r => !r.confirmation_email_sent_at && r.member?.email);
    if (!targets.length) return toast({ title: "Everyone already has a confirmation" });
    setSending("all");
    let ok = 0;
    for (const t of targets) {
      try {
        const res = await fetch("/api/public/league-event-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_id: t.id, force: true }),
        });
        if (res.ok) ok++;
      } catch { /* continue */ }
    }
    setSending(null);
    toast({ title: `Sent ${ok} of ${targets.length} confirmations` });
    await load(eventId);
  };

  const exportCsv = () => {
    const ev = events.find(e => e.id === eventId);
    const header = ["Name", "Email", "Phone", "Handicap", "Member Code", "Team", "Fee Option", "Amount", "Paid", "Tee Time", "Group", "Registered At", "Confirmation Sent"];
    const lines = rows.map(r => [
      r.member?.member_name || "", r.member?.email || "", r.member?.phone || "",
      r.member?.handicap_index ?? "", r.member?.scoring_code || "", r.team_name || "",
      r.fee_tier_label || "", money(r.fee_tier_amount_cents), r.fee_paid ? "Yes" : "No",
      r.tee_time || "", r.pairing_group ?? "", new Date(r.created_at).toLocaleString(),
      r.confirmation_email_sent_at ? new Date(r.confirmation_email_sent_at).toLocaleString() : "",
    ]);
    const csv = [header, ...lines].map(a => a.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(ev?.event_name || "event").replace(/\s+/g, "-").toLowerCase()}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveTemplate = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("golf_leagues")
      .update({ event_confirmation_email_config: config })
      .eq("id", leagueId);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Confirmation email saved" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <Label className="text-xs">Event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.event_name}{e.event_date ? ` — ${e.event_date}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
        <Button variant="outline" onClick={sendAllMissing} disabled={sending === "all" || !rows.length}>
          {sending === "all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Send missing confirmations
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Registered</p><p className="text-xl font-bold">{totals.count}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold">{totals.paid}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Event revenue</p><p className="text-xl font-bold">{money(totals.revenue)}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Who's registered</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No registrations for this event yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Hcp</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Fee option</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Tee time</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Confirmation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.member?.member_name || "—"}
                      {r.team_name ? <span className="block text-xs text-muted-foreground">{r.team_name}</span> : null}
                    </TableCell>
                    <TableCell className="text-xs">{r.member?.email || "—"}</TableCell>
                    <TableCell>{r.member?.handicap_index ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.member?.scoring_code || "—"}</TableCell>
                    <TableCell className="text-xs">{r.fee_tier_label || "—"}</TableCell>
                    <TableCell>{money(r.fee_tier_amount_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={r.fee_paid ? "default" : "secondary"}>{r.fee_paid ? "Paid" : "Unpaid"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.tee_time || "—"}</TableCell>
                    <TableCell className="text-xs">{r.pairing_group ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.confirmation_email_sent_at ? new Date(r.confirmation_email_sent_at).toLocaleDateString() : "Not sent"}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => resend(r.id)} disabled={sending === r.id || !r.member?.email}>
                          {sending === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Pairings and tee times are set in the <strong>Pairings</strong> tab and show here automatically.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Event confirmation email</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Sent to the player on every event registration. Managers and TeeVents get a tracking copy automatically.
            Available variables: {VARIABLES.map(v => `{{${v}}}`).join(", ")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Subject</Label>
              <Input value={config.subject} onChange={e => setConfig({ ...config, subject: e.target.value })} />
            </div>
            <div>
              <Label>Greeting</Label>
              <Input value={config.greeting} onChange={e => setConfig({ ...config, greeting: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Body</Label>
            <Textarea rows={8} value={config.body_text} onChange={e => setConfig({ ...config, body_text: e.target.value })} />
          </div>
          <div>
            <Label>Closing</Label>
            <Textarea rows={3} value={config.closing_text} onChange={e => setConfig({ ...config, closing_text: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Sign-off</Label>
              <Input value={config.footer_text} onChange={e => setConfig({ ...config, footer_text: e.target.value })} />
            </div>
            <div>
              <Label>Button text</Label>
              <Input value={config.button_text} onChange={e => setConfig({ ...config, button_text: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={config.show_button} onCheckedChange={v => setConfig({ ...config, show_button: v })} />
            <span className="text-sm">Show "member portal" button</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveTemplate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save email
            </Button>
            <Button variant="outline" onClick={() => setConfig(DEFAULTS)}>
              <RotateCcw className="h-4 w-4 mr-2" />Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
