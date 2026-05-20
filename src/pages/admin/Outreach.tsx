import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Plus, Send, Download, Trash2, Pencil } from "lucide-react";

type Lead = {
  id: string;
  email: string;
  first_name: string | null;
  tournament_name: string | null;
  source: string | null;
  status: string;
  created_at: string;
};
type Campaign = {
  id: string;
  name: string;
  delay_days: number;
  is_default: boolean;
  email1_subject: string | null; email1_body: string | null;
  email2_subject: string | null; email2_body: string | null;
  email3_subject: string | null; email3_body: string | null;
};

export default function AdminOutreach() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  // Add lead
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ email: "", first_name: "", tournament_name: "", source: "manual" });

  // CSV import
  const [csvText, setCsvText] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Campaign edit
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Send
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Analytics
  const [analyticsCampaignId, setAnalyticsCampaignId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) { navigate("/admin-login"); return; }
      setAuthorized(true);
      await refreshAll();
      setLoading(false);
    })();
  }, [navigate]);

  const refreshAll = async () => {
    const [{ data: l }, { data: c }, { data: q }] = await Promise.all([
      supabase.from("outreach_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("outreach_campaigns").select("*").order("created_at", { ascending: true }),
      supabase.from("outreach_queue").select("*"),
    ]);
    setLeads((l as any) || []);
    setCampaigns((c as any) || []);
    setQueue((q as any) || []);
    if (!selectedCampaignId && c && c.length) setSelectedCampaignId((c[0] as any).id);
    if (!analyticsCampaignId && c && c.length) setAnalyticsCampaignId((c[0] as any).id);
  };

  const addLead = async () => {
    const email = newLead.email.trim().toLowerCase();
    if (!email) return;
    const payload = {
      email,
      first_name: newLead.first_name.trim() || null,
      tournament_name: newLead.tournament_name.trim() || null,
      source: (newLead.source || "manual").trim() || "manual",
    };
    // Check for existing (case-insensitive)
    const { data: existing } = await supabase
      .from("outreach_leads")
      .select("id, status")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      const ok = window.confirm("A lead with this email already exists. Update it with the new info?");
      if (!ok) return;
      const { error: updErr } = await supabase
        .from("outreach_leads")
        .update({ ...payload, status: "active", unsubscribed_at: null })
        .eq("id", (existing as any).id);
      if (updErr) { toast({ title: "Update failed", description: updErr.message, variant: "destructive" }); return; }
      toast({ title: "Lead updated" });
    } else {
      const { error } = await supabase.from("outreach_leads").insert(payload);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Lead added" });
    }
    setShowAddLead(false);
    setNewLead({ email: "", first_name: "", tournament_name: "", source: "manual" });
    refreshAll();
  };

  const importCsv = async () => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return;
    // detect header
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("email");
    const headerCols = hasHeader ? lines.shift()!.split(",").map((s) => s.trim().toLowerCase()) : ["email", "first_name", "tournament_name"];
    const emailIdx = headerCols.indexOf("email");
    const fnIdx = headerCols.findIndex((c) => c === "first_name" || c === "name" || c === "firstname");
    const tnIdx = headerCols.findIndex((c) => c === "tournament_name" || c === "tournament" || c === "event");

    const rows = lines
      .map((line) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")))
      .filter((r) => r[emailIdx] && /@/.test(r[emailIdx]))
      .map((r) => ({
        email: r[emailIdx],
        first_name: fnIdx >= 0 ? r[fnIdx] || null : null,
        tournament_name: tnIdx >= 0 ? r[tnIdx] || null : null,
        source: "eventbrite",
      }));

    if (rows.length === 0) { toast({ title: "No valid rows", variant: "destructive" }); return; }
    const { error } = await supabase.from("outreach_leads").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
    if (error) { toast({ title: "Import failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Imported ${rows.length} leads` });
    setShowImport(false);
    setCsvText("");
    refreshAll();
  };

  const deleteLead = async (id: string) => {
    await supabase.from("outreach_leads").delete().eq("id", id);
    refreshAll();
  };

  const saveCampaign = async () => {
    if (!editingCampaign) return;
    const { id, ...rest } = editingCampaign;
    const { error } = await supabase.from("outreach_campaigns").update(rest).eq("id", id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campaign saved" });
    setEditingCampaign(null);
    refreshAll();
  };

  const createCampaign = async () => {
    const { error } = await supabase.from("outreach_campaigns").insert({
      name: "New Sequence", delay_days: 2,
      email1_subject: "", email1_body: "",
      email2_subject: "", email2_body: "",
      email3_subject: "", email3_body: "",
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    refreshAll();
  };

  const sendSequence = async (scheduleLater: boolean) => {
    if (!selectedCampaignId) { toast({ title: "Pick a campaign", variant: "destructive" }); return; }
    const targetIds = Array.from(selectedLeadIds);
    if (targetIds.length === 0) { toast({ title: "Pick leads", variant: "destructive" }); return; }
    setSending(true);
    const rows = targetIds.map((lead_id) => ({
      lead_id, campaign_id: selectedCampaignId, email_number: 1,
      scheduled_for: scheduleLater
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : new Date().toISOString(),
    }));
    const { error } = await supabase.from("outreach_queue").insert(rows);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); setSending(false); return; }

    // Trigger immediate dispatch if "Send Now"
    if (!scheduleLater) {
      const { error: invokeErr } = await supabase.functions.invoke("send-outreach-emails", { body: {} });
      if (invokeErr) toast({ title: "Queued but dispatch failed", description: invokeErr.message, variant: "destructive" });
    }
    toast({ title: scheduleLater ? `Scheduled ${rows.length} sequences` : `Queued & dispatched ${rows.length} sequences` });
    setSelectedLeadIds(new Set());
    setSending(false);
    refreshAll();
  };

  const exportAnalyticsCsv = () => {
    const items = queue.filter((q) => q.campaign_id === analyticsCampaignId);
    const lines = ["email_number,sent_at,opened_at,clicked_at,click_url,lead_id"];
    for (const i of items) lines.push([i.email_number, i.sent_at || "", i.opened_at || "", i.clicked_at || "", i.click_url || "", i.lead_id].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "outreach-analytics.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const activeLeads = leads.filter((l) => l.status === "active");
  const analyticsRows = [1, 2, 3].map((n) => {
    const items = queue.filter((q) => q.campaign_id === analyticsCampaignId && q.email_number === n);
    const sent = items.filter((i) => i.sent_at).length;
    const opens = items.filter((i) => i.opened_at).length;
    const clicks = items.filter((i) => i.clicked_at).length;
    return { n, sent, opens, clicks, rate: sent ? Math.round((opens / sent) * 100) : 0 };
  });
  const conversions = leads.filter((l) => l.status === "converted").length;

  if (loading) {
    return <Layout><div className="container mx-auto py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div></Layout>;
  }
  if (!authorized) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Outreach</h1>
          <p className="text-muted-foreground mt-1">Import leads, manage sequences, and track conversions.</p>
        </div>

        <Tabs defaultValue="leads">
          <TabsList className="mb-4">
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* LEADS */}
          <TabsContent value="leads">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="text-sm text-muted-foreground">
                  {activeLeads.length} active · {leads.filter(l => l.status === "unsubscribed").length} unsubscribed · {conversions} converted
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowImport(true)}><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
                  <Button size="sm" onClick={() => setShowAddLead(true)}><Plus className="h-4 w-4 mr-1" /> Add Single</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">First Name</th>
                      <th className="py-2 pr-3">Tournament</th>
                      <th className="py-2 pr-3">Source</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{l.email}</td>
                        <td className="py-2 pr-3">{l.first_name || "—"}</td>
                        <td className="py-2 pr-3">{l.tournament_name || "—"}</td>
                        <td className="py-2 pr-3">{l.source || "—"}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={l.status === "active" ? "default" : l.status === "converted" ? "secondary" : "outline"}>{l.status}</Badge>
                        </td>
                        <td className="py-2">
                          <Button size="icon" variant="ghost" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No leads yet. Import a CSV or add one manually.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* CAMPAIGNS */}
          <TabsContent value="campaigns">
            <Card className="p-4">
              <div className="flex justify-end mb-3">
                <Button size="sm" onClick={createCampaign}><Plus className="h-4 w-4 mr-1" /> Create Sequence</Button>
              </div>
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="border rounded p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.is_default && <Badge variant="secondary">Default</Badge>}
                        </div>
                        <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                          <li>• Email 1: {c.email1_subject || <em>(no subject)</em>}</li>
                          <li>• Email 2: {c.email2_subject || <em>(no subject)</em>}</li>
                          <li>• Email 3: {c.email3_subject || <em>(no subject)</em>}</li>
                          <li>• Delay: {c.delay_days} days between emails</li>
                        </ul>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setEditingCampaign({ ...c })}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* SEND */}
          <TabsContent value="send">
            <Card className="p-4 space-y-4">
              <div>
                <Label>Select Campaign</Label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger className="w-full md:w-96"><SelectValue placeholder="Pick a campaign" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Select Leads ({selectedLeadIds.size} selected)</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedLeadIds(new Set(activeLeads.map((l) => l.id)))}>Select all active</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLeadIds(new Set())}>Clear</Button>
                  </div>
                </div>
                <div className="border rounded max-h-96 overflow-y-auto">
                  {activeLeads.map((l) => (
                    <label key={l.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={selectedLeadIds.has(l.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedLeadIds);
                          if (checked) next.add(l.id); else next.delete(l.id);
                          setSelectedLeadIds(next);
                        }}
                      />
                      <span className="flex-1 text-sm">{l.email}</span>
                      <span className="text-xs text-muted-foreground">{l.first_name || ""} {l.tournament_name ? `· ${l.tournament_name}` : ""}</span>
                    </label>
                  ))}
                  {activeLeads.length === 0 && <div className="p-4 text-sm text-center text-muted-foreground">No active leads.</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => sendSequence(false)} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send Now
                </Button>
                <Button variant="outline" onClick={() => sendSequence(true)} disabled={sending}>Schedule for later</Button>
              </div>
              <p className="text-xs text-muted-foreground">Emails 2 and 3 are auto-scheduled based on the campaign delay after each prior email is sent.</p>
            </Card>
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics">
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={analyticsCampaignId} onValueChange={setAnalyticsCampaignId}>
                  <SelectTrigger className="w-full md:w-96"><SelectValue placeholder="Pick a campaign" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportAnalyticsCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
              </div>

              <div className="space-y-2">
                {analyticsRows.map((r) => (
                  <div key={r.n} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                    <div className="font-medium">Email {r.n}</div>
                    <div className="flex gap-4 text-muted-foreground">
                      <span>Sent: <b className="text-foreground">{r.sent}</b></span>
                      <span>Opens: <b className="text-foreground">{r.opens}</b></span>
                      <span>Clicks: <b className="text-foreground">{r.clicks}</b></span>
                      <span>Open rate: <b className="text-foreground">{r.rate}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border rounded p-3 text-sm">
                Conversions (leads marked converted): <b>{conversions}</b>
                {leads.length > 0 && <> · Conversion rate: <b>{Math.round((conversions / leads.length) * 100)}%</b></>}
              </div>

              <div>
                <div className="font-semibold text-sm mb-2">Per-recipient activity</div>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground border-b bg-muted/30">
                      <tr>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">First name</th>
                        <th className="py-2 px-3 text-center">#</th>
                        <th className="py-2 px-3">Scheduled</th>
                        <th className="py-2 px-3">Sent</th>
                        <th className="py-2 px-3">Opened</th>
                        <th className="py-2 px-3">Clicked</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue
                        .filter((q) => q.campaign_id === analyticsCampaignId)
                        .sort((a, b) => (b.scheduled_for || "").localeCompare(a.scheduled_for || ""))
                        .map((q) => {
                          const lead = leads.find((l) => l.id === q.lead_id);
                          const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : "—";
                          let status = "Pending"; let cls = "text-yellow-700";
                          if (q.error) { status = "Failed"; cls = "text-destructive"; }
                          else if (q.clicked_at) { status = "Clicked"; cls = "text-emerald-700"; }
                          else if (q.opened_at) { status = "Opened"; cls = "text-emerald-700"; }
                          else if (q.sent_at) { status = "Delivered"; cls = "text-foreground"; }
                          return (
                            <tr key={q.id} className="border-b last:border-0">
                              <td className="py-2 px-3 font-medium">{lead?.email || q.lead_id.slice(0, 8)}</td>
                              <td className="py-2 px-3">{lead?.first_name || "—"}</td>
                              <td className="py-2 px-3 text-center">{q.email_number}</td>
                              <td className="py-2 px-3 text-xs">{fmt(q.scheduled_for)}</td>
                              <td className="py-2 px-3 text-xs">{fmt(q.sent_at)}</td>
                              <td className="py-2 px-3 text-xs">{fmt(q.opened_at)}</td>
                              <td className="py-2 px-3 text-xs">{fmt(q.clicked_at)}</td>
                              <td className={`py-2 px-3 text-xs font-medium ${cls}`}>
                                {status}
                                {q.error && <div className="text-[10px] text-destructive">{q.error}</div>}
                              </td>
                            </tr>
                          );
                        })}
                      {queue.filter((q) => q.campaign_id === analyticsCampaignId).length === 0 && (
                        <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No sends yet for this campaign.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email *</Label><Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} /></div>
            <div><Label>First name</Label><Input value={newLead.first_name} onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })} /></div>
            <div><Label>Tournament name</Label><Input value={newLead.tournament_name} onChange={(e) => setNewLead({ ...newLead, tournament_name: e.target.value })} /></div>
            <div><Label>Source</Label>
              <Input
                list="outreach-source-options"
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                placeholder="e.g. Eventbrite, Google Forms, GiveButter, Facebook, no website"
              />
              <datalist id="outreach-source-options">
                <option value="manual" />
                <option value="eventbrite" />
                <option value="google forms" />
                <option value="givebutter" />
                <option value="facebook" />
                <option value="instagram" />
                <option value="linkedin" />
                <option value="no website" />
                <option value="referral" />
                <option value="other" />
              </datalist>
              <p className="text-[11px] text-muted-foreground mt-1">Used in templates as <code>{`{{source}}`}</code>.</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button><Button onClick={addLead}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Leads from CSV</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Paste CSV. Columns: <code>email, first_name, tournament_name</code>. Header row optional. Duplicates by email are skipped.
            </p>
            <Textarea rows={10} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="email,first_name,tournament_name&#10;john@club.com,John,Spring Open" />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button><Button onClick={importCsv}>Import</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign */}
      <Dialog open={!!editingCampaign} onOpenChange={(o) => !o && setEditingCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Email Sequence</DialogTitle></DialogHeader>
          {editingCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Campaign Name</Label><Input value={editingCampaign.name} onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })} /></div>
                <div><Label>Delay between emails (days)</Label><Input type="number" min={1} value={editingCampaign.delay_days} onChange={(e) => setEditingCampaign({ ...editingCampaign, delay_days: parseInt(e.target.value) || 2 })} /></div>
              </div>
              {[1, 2, 3].map((n) => {
                const subjKey = `email${n}_subject` as keyof Campaign;
                const bodyKey = `email${n}_body` as keyof Campaign;
                return (
                  <div key={n} className="border rounded p-3 space-y-2">
                    <div className="font-semibold text-sm">Email {n}</div>
                    <div><Label>Subject</Label><Input value={(editingCampaign[subjKey] as string) || ""} onChange={(e) => setEditingCampaign({ ...editingCampaign, [subjKey]: e.target.value } as Campaign)} /></div>
                    <div><Label>Body (use {`{{first_name}}`})</Label><Textarea rows={10} value={(editingCampaign[bodyKey] as string) || ""} onChange={(e) => setEditingCampaign({ ...editingCampaign, [bodyKey]: e.target.value } as Campaign)} /></div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditingCampaign(null)}>Cancel</Button><Button onClick={saveCampaign}>Save Campaign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
