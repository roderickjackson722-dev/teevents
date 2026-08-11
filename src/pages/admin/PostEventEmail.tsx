import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ENDPOINT = "/api/public/post-event-organizer-email";

interface Config {
  enabled: boolean;
  delay_days: number;
  subject: string;
  intro: string;
  closing: string;
  signature: string;
  extra_recipients: string[];
  bcc: string[];
}

const DEFAULTS: Config = {
  enabled: true,
  delay_days: 7,
  subject: "Thank You – {{tournament_name}} | TeeVents Golf",
  intro:
    "Thank you for trusting TeeVents to power your tournament, {{tournament_name}}!\n\nWe hope your event was a success and that our platform helped you save time, simplify registration, and create a professional experience for your players and sponsors.",
  closing:
    "Thank you again for choosing TeeVents. We look forward to helping you run many more successful events!",
  signature: "Rod Jackson\nTeeVents Golf\ninfo@teevents.golf",
  extra_recipients: [],
  bcc: ["info@teevents.golf"],
};

interface Row {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  contact_email: string | null;
  post_event_email_sent: boolean | null;
  post_event_email_sent_at: string | null;
  post_event_email_opt_out: boolean | null;
}

export default function AdminPostEventEmail() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("info@teevents.golf");
  const [testing, setTesting] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: setting }, { data: tournaments }] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "post_event_organizer_email").maybeSingle() as any,
      supabase
        .from("tournaments")
        .select("id, title, date, end_date, contact_email, post_event_email_sent, post_event_email_sent_at, post_event_email_opt_out")
        .order("date", { ascending: false })
        .limit(200) as any,
    ]);
    const v = (setting?.value ?? {}) as Partial<Config>;
    setConfig({
      ...DEFAULTS,
      ...(v && typeof v === "object" ? v : {}),
      extra_recipients: Array.isArray(v?.extra_recipients) ? v.extra_recipients : [],
      bcc: Array.isArray(v?.bcc) ? v.bcc : DEFAULTS.bcc,
    });
    setRows((tournaments as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key: "post_event_organizer_email",
          value: config as any,
          description: "Post-tournament thank-you email sent to organizers",
        } as any,
        { onConflict: "key" },
      );
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
    setSaving(false);
  };

  const call = async (payload: Record<string, unknown>) => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  };

  const sendTest = async () => {
    const target = rows.find((r) => r.post_event_email_sent) || rows[0];
    if (!target) {
      toast({ title: "No tournaments available to preview", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      await call({ tournament_id: target.id, test_email: testEmail });
      toast({ title: "Test email sent", description: `Sent to ${testEmail} using "${target.title}".` });
    } catch (e) {
      toast({ title: "Test failed", description: (e as Error).message, variant: "destructive" });
    }
    setTesting(false);
  };

  const sendNow = async (row: Row) => {
    setBusyId(row.id);
    try {
      const data = await call({ tournament_id: row.id, force: true });
      const r = data?.results?.[0];
      if (r?.ok) toast({ title: "Email sent", description: `Sent to ${r.to}` });
      else throw new Error(r?.error || r?.skipped || "Send failed");
      await load();
    } catch (e) {
      toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" });
    }
    setBusyId(null);
  };

  const toggleOptOut = async (row: Row, value: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, post_event_email_opt_out: value } : r)));
    const { error } = await supabase
      .from("tournaments")
      .update({ post_event_email_opt_out: value } as any)
      .eq("id", row.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const resetSent = async (row: Row) => {
    const { error } = await supabase
      .from("tournaments")
      .update({ post_event_email_sent: false, post_event_email_sent_at: null } as any)
      .eq("id", row.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Reset — this event is eligible again" });
      load();
    }
  };

  const filtered = rows.filter((r) => (r.title || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post-Event Organizer Email</h1>
        <p className="text-muted-foreground">
          Automated thank-you email sent to the tournament organizer after their event ends. Runs daily at 9:00 AM UTC.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Automated sending</Label>
                <p className="text-sm text-muted-foreground">Turn off to stop all automatic post-event emails.</p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Days after event end</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.delay_days}
                  onChange={(e) => setConfig({ ...config, delay_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Opening message</Label>
              <Textarea rows={5} value={config.intro} onChange={(e) => setConfig({ ...config, intro: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                Placeholders: <code>{"{{tournament_name}}"}</code>, <code>{"{{organizer_name}}"}</code>
              </p>
            </div>

            <div className="space-y-1">
              <Label>Closing message</Label>
              <Textarea rows={3} value={config.closing} onChange={(e) => setConfig({ ...config, closing: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Signature</Label>
              <Textarea rows={3} value={config.signature} onChange={(e) => setConfig({ ...config, signature: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>BCC (comma separated)</Label>
                <Input
                  value={config.bcc.join(", ")}
                  onChange={(e) =>
                    setConfig({ ...config, bcc: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Additional recipients (comma separated)</Label>
                <Input
                  value={config.extra_recipients.join(", ")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      extra_recipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-2">
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Settings
              </Button>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Send test to</Label>
                  <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-56" />
                </div>
                <Button variant="outline" onClick={sendTest} disabled={testing || !testEmail}>
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Test
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Tournaments</h2>
              <Input
                placeholder="Search tournaments..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-[220px]">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Ends {r.end_date || r.date || "—"} ·{" "}
                      {r.post_event_email_sent
                        ? `Sent ${r.post_event_email_sent_at ? new Date(r.post_event_email_sent_at).toLocaleDateString() : ""}`
                        : "Not sent"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={!!r.post_event_email_opt_out}
                        onCheckedChange={(v) => toggleOptOut(r, v)}
                      />
                      Skip this event
                    </label>
                    {r.post_event_email_sent && (
                      <Button variant="ghost" size="sm" onClick={() => resetSent(r)}>
                        Reset
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => sendNow(r)} disabled={busyId === r.id}>
                      {busyId === r.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Now
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground">No tournaments found.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
