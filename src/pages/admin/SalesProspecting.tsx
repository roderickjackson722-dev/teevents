import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, Sparkles, Download, ExternalLink, Trash2, Pencil, Upload, FileText } from "lucide-react";

type Lead = {
  id: string;
  source: string;
  source_url: string | null;
  tournament_name: string | null;
  organizer_name: string | null;
  event_date: string | null;
  location: string | null;
  contact_email: string | null;
  contact_social_handle: string | null;
  status: string;
  detected_setup: string | null;
  calendly_link: string | null;
  generated_message: string | null;
  message_sent_at: string | null;
  replied_at: string | null;
  reply_text: string | null;
  demo_booked_at: string | null;
  notes: string | null;
  created_at: string;
  source_type?: string | null;
  flyer_image_url?: string | null;
  payment_keywords?: string[] | null;
};

async function copyRichText(html: string, plain: string) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch (e) {
    console.warn("Rich copy failed, falling back", e);
  }
  await navigator.clipboard.writeText(plain);
  return false;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-muted text-foreground",
  contacted: "bg-blue-100 text-blue-800",
  replied: "bg-amber-100 text-amber-800",
  demo_booked: "bg-emerald-100 text-emerald-800",
  closed: "bg-zinc-200 text-zinc-700",
};

export default function SalesProspecting() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlsInput, setUrlsInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [messageLead, setMessageLead] = useState<Lead | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (!isAdmin) { navigate("/"); return; }
      setAuthorized(true);
      await loadLeads();
    })();
  }, [navigate]);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("sales_leads").select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const importUrls = async () => {
    const urls = urlsInput.split("\n").map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-lead-data", { body: { urls } });
      if (error) throw error;
      const results: any[] = data?.results || [];
      const { data: { user } } = await supabase.auth.getUser();
      const rows = results.map(r => ({
        source: r.source || "manual",
        source_url: r.source_url,
        tournament_name: r.tournament_name || null,
        organizer_name: r.organizer_name || null,
        event_date: r.event_date || null,
        location: r.location || null,
        contact_email: r.contact_email || null,
        detected_setup: r.detected_setup || "unknown",
        extracted_data: r.extracted_data || {},
        status: "new",
        created_by: user?.id,
      }));
      const { error: insErr } = await supabase.from("sales_leads").insert(rows);
      if (insErr) throw insErr;
      toast({ title: `Imported ${rows.length} lead(s)` });
      setUrlsInput("");
      await loadLeads();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const generateForSelected = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    try {
      for (const id of selected) {
        const lead = leads.find(l => l.id === id);
        if (!lead) continue;
        const { data, error } = await supabase.functions.invoke("generate-prospect-message", {
          body: {
            tournament_name: lead.tournament_name,
            organizer_name: lead.organizer_name,
            event_date: lead.event_date,
            location: lead.location,
            detected_setup: lead.detected_setup,
            calendly_link: lead.calendly_link,
          },
        });
        if (error) throw error;
        await supabase.from("sales_leads").update({ generated_message: data.message }).eq("id", id);
      }
      toast({ title: `Generated ${selected.size} message(s)` });
      setSelected(new Set());
      await loadLeads();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    const { error } = await supabase.from("sales_leads").update(patch).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else await loadLeads();
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await supabase.from("sales_leads").delete().eq("id", id);
    await loadLeads();
  };

  const markSent = async (id: string) => {
    await updateLead(id, { status: "contacted", message_sent_at: new Date().toISOString() } as any);
  };

  const exportCsv = () => {
    const headers = ["Tournament", "Organizer", "Date", "Location", "Email", "Status", "Source URL"];
    const rows = leads.map(l => [l.tournament_name, l.organizer_name, l.event_date, l.location, l.contact_email, l.status, l.source_url].map(v => `"${(v || "").toString().replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const followUps = useMemo(() => leads.filter(l => l.status === "contacted" && l.message_sent_at), [leads]);

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.message_sent_at).length;
    const replied = leads.filter(l => l.replied_at).length;
    const demos = leads.filter(l => l.demo_booked_at).length;
    const conv = contacted ? Math.round((demos / contacted) * 100) : 0;
    const respTimes = leads.filter(l => l.message_sent_at && l.replied_at).map(l => (new Date(l.replied_at!).getTime() - new Date(l.message_sent_at!).getTime()) / (1000 * 60 * 60));
    const avgResp = respTimes.length ? Math.round(respTimes.reduce((a, b) => a + b, 0) / respTimes.length) : 0;
    return { total, contacted, replied, demos, conv, avgResp };
  }, [leads]);

  if (authorized === null) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Sales Prospecting</h1>
          <p className="text-muted-foreground">Find golf tournament organizers, generate personal outreach, and track demos.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")}>← Admin</Button>
      </header>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="flyer">Flyer Import</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups ({followUps.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Import leads</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Paste Eventbrite or Facebook URLs (one per line). The tool will scrape what it can.</p>
              <Textarea rows={6} value={urlsInput} onChange={e => setUrlsInput(e.target.value)} placeholder="https://www.eventbrite.com/e/...&#10;https://www.facebook.com/groups/.../posts/..." />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={importUrls} disabled={importing || !urlsInput.trim()}>
                  {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import & scrape
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}>Add manually</Button>
                <Button variant="outline" onClick={exportCsv} disabled={!leads.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Leads</CardTitle>
              <Button onClick={generateForSelected} disabled={selected.size === 0 || generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate messages ({selected.size})
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin" /></div> : leads.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No leads yet. Import some URLs above.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Setup</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map(l => (
                      <TableRow key={l.id}>
                        <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} /></TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {l.flyer_image_url && (
                              <a href={l.flyer_image_url} target="_blank" rel="noreferrer" title="View flyer">
                                <img src={l.flyer_image_url} alt="flyer" className="h-10 w-10 object-cover rounded border border-border" />
                              </a>
                            )}
                            <span>
                              {l.tournament_name || <span className="text-muted-foreground italic">(unknown)</span>}
                              {l.source_url && <a href={l.source_url} target="_blank" rel="noreferrer" className="ml-1 inline-block text-muted-foreground"><ExternalLink className="h-3 w-3 inline" /></a>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{l.organizer_name || "—"}</TableCell>
                        <TableCell>
                          {l.detected_setup ? (
                            <Badge variant="outline" className="capitalize">{l.detected_setup}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{l.event_date || "—"}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{l.location || "—"}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[l.status] || ""}>{l.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditLead(l)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setMessageLead(l)}>Message</Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteLead(l.id)}><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flyer" className="space-y-4">
          <FlyerImportTab onSaved={loadLeads} />
        </TabsContent>

        <TabsContent value="followups" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Awaiting reply</CardTitle></CardHeader>
            <CardContent>
              {followUps.length === 0 ? <p className="text-muted-foreground text-center py-8">No leads awaiting follow-up.</p> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tournament</TableHead><TableHead>Organizer</TableHead>
                    <TableHead>Sent</TableHead><TableHead>Days</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {followUps.map(l => {
                      const days = Math.floor((Date.now() - new Date(l.message_sent_at!).getTime()) / 86400000);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.tournament_name || "—"}</TableCell>
                          <TableCell>{l.organizer_name || "—"}</TableCell>
                          <TableCell>{new Date(l.message_sent_at!).toLocaleDateString()}</TableCell>
                          <TableCell>{days}d</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="sm" variant="outline" onClick={async () => {
                              const { data, error } = await supabase.functions.invoke("generate-prospect-message", {
                                body: { tournament_name: l.tournament_name, organizer_name: l.organizer_name, event_date: l.event_date, location: l.location, detected_setup: l.detected_setup, calendly_link: l.calendly_link, kind: "followup" },
                              });
                              if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
                              await supabase.from("sales_leads").update({ generated_message: data.message }).eq("id", l.id);
                              await loadLeads();
                              setMessageLead({ ...l, generated_message: data.message });
                            }}>Generate follow-up</Button>
                            <Button size="sm" onClick={() => updateLead(l.id, { status: "replied", replied_at: new Date().toISOString() } as any)}>Mark replied</Button>
                            <Button size="sm" variant="default" onClick={() => updateLead(l.id, { status: "demo_booked", demo_booked_at: new Date().toISOString() } as any)}>Demo booked</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total leads" value={stats.total} />
            <StatCard label="Contacted" value={stats.contacted} />
            <StatCard label="Replied" value={stats.replied} />
            <StatCard label="Demos booked" value={stats.demos} />
            <StatCard label="Conversion" value={`${stats.conv}%`} />
            <StatCard label="Avg response" value={stats.avgResp ? `${stats.avgResp}h` : "—"} />
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <Card><CardContent className="pt-6 prose prose-sm max-w-none">
            <h3>Compliance &amp; rate limits</h3>
            <ul>
              <li><strong>Eventbrite:</strong> Light scraping for lead generation. Respect robots.txt; prefer manual entry where possible.</li>
              <li><strong>Facebook:</strong> Automated messaging is prohibited. This tool only generates copy — you send manually via Messenger or email.</li>
              <li><strong>Manual rate limit:</strong> Send no more than <strong>20 messages per hour</strong> to avoid spam flags.</li>
              <li>All outreach must include an easy way to opt out (just don't reply).</li>
            </ul>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editLead} onOpenChange={(o) => !o && setEditLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit lead</DialogTitle></DialogHeader>
          {editLead && (
            <div className="space-y-3">
              <Field label="Tournament name"><Input value={editLead.tournament_name || ""} onChange={e => setEditLead({ ...editLead, tournament_name: e.target.value })} /></Field>
              <Field label="Organizer name"><Input value={editLead.organizer_name || ""} onChange={e => setEditLead({ ...editLead, organizer_name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Event date"><Input type="date" value={editLead.event_date || ""} onChange={e => setEditLead({ ...editLead, event_date: e.target.value })} /></Field>
                <Field label="Status">
                  <Select value={editLead.status} onValueChange={(v) => setEditLead({ ...editLead, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["new", "contacted", "replied", "demo_booked", "closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Location"><Input value={editLead.location || ""} onChange={e => setEditLead({ ...editLead, location: e.target.value })} /></Field>
              <Field label="Contact email"><Input value={editLead.contact_email || ""} onChange={e => setEditLead({ ...editLead, contact_email: e.target.value })} /></Field>
              <Field label="Social handle / Messenger"><Input value={editLead.contact_social_handle || ""} onChange={e => setEditLead({ ...editLead, contact_social_handle: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Detected setup">
                  <Select value={editLead.detected_setup || "unknown"} onValueChange={(v) => setEditLead({ ...editLead, detected_setup: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["eventbrite", "manual", "facebook", "unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Calendly link (optional override)"><Input placeholder="https://calendly.com/..." value={editLead.calendly_link || ""} onChange={e => setEditLead({ ...editLead, calendly_link: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><Textarea rows={3} value={editLead.notes || ""} onChange={e => setEditLead({ ...editLead, notes: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLead(null)}>Cancel</Button>
            <Button onClick={async () => { if (editLead) { const { id, created_at, ...patch } = editLead as any; await updateLead(id, patch); setEditLead(null); } }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message dialog */}
      <Dialog open={!!messageLead} onOpenChange={(o) => !o && setMessageLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Outreach message</DialogTitle></DialogHeader>
          {messageLead && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">For: <strong>{messageLead.tournament_name || "—"}</strong> · {messageLead.organizer_name || "—"}</p>
              {messageLead.flyer_image_url && (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Uploaded flyer</span>
                    <a href={messageLead.flyer_image_url} download target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </div>
                  <a href={messageLead.flyer_image_url} target="_blank" rel="noreferrer" title="Click to enlarge">
                    <img src={messageLead.flyer_image_url} alt="Flyer" className="max-h-64 w-auto mx-auto rounded border border-border hover:opacity-90 transition-opacity" />
                  </a>
                </div>
              )}
              {!messageLead.generated_message ? (
                <div className="text-center py-6">
                  <Button onClick={async () => {
                    const { data, error } = await supabase.functions.invoke("generate-prospect-message", {
                      body: { tournament_name: messageLead.tournament_name, organizer_name: messageLead.organizer_name, event_date: messageLead.event_date, location: messageLead.location, detected_setup: messageLead.detected_setup, calendly_link: messageLead.calendly_link },
                    });
                    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
                    await supabase.from("sales_leads").update({ generated_message: data.message }).eq("id", messageLead.id);
                    setMessageLead({ ...messageLead, generated_message: data.message, ...(data.message_html ? { generated_message_html: data.message_html } as any : {}) });
                    await loadLeads();
                  }}><Sparkles className="mr-2 h-4 w-4" />Generate message</Button>
                </div>
              ) : (
                <>
                  <Textarea rows={12} value={messageLead.generated_message} onChange={e => setMessageLead({ ...messageLead, generated_message: e.target.value })} />
                  {(messageLead as any).generated_message_html && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: (messageLead as any).generated_message_html }} />
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={async () => {
                      const html = (messageLead as any).generated_message_html as string | undefined;
                      if (html) { await copyRichText(html, messageLead.generated_message || ""); toast({ title: "Copied with hyperlinks" }); }
                      else { await navigator.clipboard.writeText(messageLead.generated_message || ""); toast({ title: "Copied" }); }
                    }}><Copy className="mr-2 h-4 w-4" />Copy (rich text)</Button>
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(messageLead.generated_message || ""); toast({ title: "Copied as plain text" }); }}>Copy plain</Button>
                    <Button variant="outline" onClick={async () => {
                      await supabase.from("sales_leads").update({ generated_message: messageLead.generated_message }).eq("id", messageLead.id);
                      toast({ title: "Saved" });
                    }}>Save edits</Button>
                    <Button variant="default" onClick={async () => { await markSent(messageLead.id); setMessageLead(null); toast({ title: "Marked as sent" }); }}>Mark as sent</Button>
                  </div>
                  <Field label="Reply (paste here when received)">
                    <Textarea rows={3} value={messageLead.reply_text || ""} onChange={e => setMessageLead({ ...messageLead, reply_text: e.target.value })} />
                  </Field>
                  <Button variant="outline" size="sm" onClick={async () => {
                    await updateLead(messageLead.id, { reply_text: messageLead.reply_text, replied_at: new Date().toISOString(), status: "replied" } as any);
                    setMessageLead(null);
                  }}>Save reply</Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual add dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add lead manually</DialogTitle></DialogHeader>
          <ManualForm onSaved={async () => { setManualOpen(false); await loadLeads(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ManualForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ tournament_name: "", organizer_name: "", event_date: "", location: "", contact_email: "", contact_social_handle: "", source_url: "", source: "manual" });
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Tournament name *"><Input value={form.tournament_name} onChange={e => setForm({ ...form, tournament_name: e.target.value })} /></Field>
      <Field label="Organizer name"><Input value={form.organizer_name} onChange={e => setForm({ ...form, organizer_name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Event date"><Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></Field>
        <Field label="Source">
          <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="eventbrite">Eventbrite</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Location"><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
      <Field label="Email"><Input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></Field>
      <Field label="Social handle / Messenger"><Input value={form.contact_social_handle} onChange={e => setForm({ ...form, contact_social_handle: e.target.value })} /></Field>
      <Field label="Source URL"><Input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} /></Field>
      <DialogFooter>
        <Button disabled={saving || !form.tournament_name} onClick={async () => {
          setSaving(true);
          const { data: { user } } = await supabase.auth.getUser();
          const { error } = await supabase.from("sales_leads").insert({ ...form, event_date: form.event_date || null, created_by: user?.id });
          setSaving(false);
          if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
          onSaved();
        }}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save lead</Button>
      </DialogFooter>
    </div>
  );
}

function FlyerImportTab({ onSaved }: { onSaved: () => Promise<void> | void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [messageHtml, setMessageHtml] = useState<string>("");
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [form, setForm] = useState({
    tournament_name: "", organizer_name: "", date: "", location: "", fee: "",
    contact_email: "", calendly_link: "", detected_setup: "unknown" as "eventbrite" | "manual" | "unknown",
  });
  const [keywords, setKeywords] = useState<string[]>([]);

  const onFile = (f: File | null) => {
    setFile(f);
    setExtracted(null);
    setMessage("");
    setMessageHtml("");
    setSavedLeadId(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const fileToBase64 = (f: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const extract = async () => {
    if (!file) return;
    setExtracting(true);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("extract-flyer-data", { body: { image_base64: b64 } });
      if (error) throw error;
      const d = data?.data || {};
      setExtracted(d);
      setKeywords(d.payment_keywords || []);
      setForm({
        tournament_name: d.tournament_name || "",
        organizer_name: d.organizer_name || "",
        date: d.date || "",
        location: d.location || "",
        fee: d.fee || "",
        contact_email: d.contact_email || "",
        calendly_link: "",
        detected_setup: d.detected_setup || "unknown",
      });
      toast({ title: "Flyer extracted", description: `Detected: ${d.detected_setup}` });
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const generateMessage = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prospect-message", {
        body: {
          tournament_name: form.tournament_name,
          organizer_name: form.organizer_name,
          detected_setup: form.detected_setup,
          calendly_link: form.calendly_link || undefined,
        },
      });
      if (error) throw error;
      setMessage(data.message || "");
      setMessageHtml(data.message_html || "");
    } catch (e: any) {
      toast({ title: "Generate failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveLead = async (status: string = "new", extras: Record<string, any> = {}) => {
    let flyerUrl: string | null = null;
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("sales-flyers").upload(path, file, { upsert: false });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("sales-flyers").getPublicUrl(path);
        flyerUrl = pub.publicUrl;
      }
    }
    const { data: { user } } = await supabase.auth.getUser();
    const row: any = {
      source: "flyer",
      source_type: "flyer",
      tournament_name: form.tournament_name || null,
      organizer_name: form.organizer_name || null,
      event_date: /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? form.date : null,
      location: form.location || null,
      contact_email: form.contact_email || null,
      detected_setup: form.detected_setup,
      calendly_link: form.calendly_link || null,
      payment_keywords: keywords.length ? keywords : null,
      flyer_image_url: flyerUrl,
      generated_message: message || null,
      extracted_data: extracted ? { ...extracted, fee: form.fee } : null,
      status,
      created_by: user?.id,
      ...extras,
    };
    if (savedLeadId) {
      const { error } = await supabase.from("sales_leads").update(row).eq("id", savedLeadId);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return null; }
      await onSaved();
      return savedLeadId;
    }
    const { data, error } = await supabase.from("sales_leads").insert(row).select("id").single();
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return null; }
    setSavedLeadId(data.id);
    await onSaved();
    return data.id;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload flyer</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          {preview && (
            <div className="rounded-md border overflow-hidden bg-muted/30">
              <img src={preview} alt="Flyer preview" className="w-full max-h-72 object-contain" />
            </div>
          )}
          <Button onClick={extract} disabled={!file || extracting} className="w-full">
            {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Extract & analyze
          </Button>

          {extracted && (
            <div className="space-y-3 pt-2 border-t">
              <Field label="Tournament name"><Input value={form.tournament_name} onChange={(e) => setForm({ ...form, tournament_name: e.target.value })} /></Field>
              <Field label="Organizer name"><Input value={form.organizer_name} onChange={(e) => setForm({ ...form, organizer_name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date (YYYY-MM-DD if known)"><Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
                <Field label="Entry fee"><Input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></Field>
              </div>
              <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
              <Field label="Contact email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
              <div>
                <Label className="text-xs">Payment keywords found</Label>
                <div className="flex flex-wrap gap-1 mt-1 min-h-[28px]">
                  {keywords.length ? keywords.map(k => <Badge key={k} variant="secondary">{k}</Badge>) : <span className="text-xs text-muted-foreground">None detected</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Detected setup">
                  <Select value={form.detected_setup} onValueChange={(v: any) => setForm({ ...form, detected_setup: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eventbrite">Eventbrite-like</SelectItem>
                      <SelectItem value="manual">Manual Payments</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Calendly link (optional)"><Input placeholder="https://calendly.com/..." value={form.calendly_link} onChange={(e) => setForm({ ...form, calendly_link: e.target.value })} /></Field>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Generated message</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!extracted ? (
            <p className="text-sm text-muted-foreground">Upload and extract a flyer first.</p>
          ) : (
            <>
              <Button onClick={generateMessage} disabled={generating || !form.tournament_name} className="w-full">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate message ({form.detected_setup})
              </Button>
              {message && (
                <>
                  <Textarea rows={14} value={message} onChange={(e) => setMessage(e.target.value)} />
                  {messageHtml && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm prose prose-sm max-w-none [&_a]:text-primary [&_a]:underline" dangerouslySetInnerHTML={{ __html: messageHtml }} />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={async () => {
                      if (messageHtml) { await copyRichText(messageHtml, message); toast({ title: "Copied with hyperlinks" }); }
                      else { await navigator.clipboard.writeText(message); toast({ title: "Copied" }); }
                    }}><Copy className="mr-2 h-4 w-4" />Copy (rich text)</Button>
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(message); toast({ title: "Copied as plain text" }); }}>Copy plain</Button>
                    <Button variant="outline" onClick={() => saveLead("new")}>Save as lead</Button>
                    <Button onClick={async () => {
                      const id = await saveLead("contacted", { message_sent_at: new Date().toISOString() });
                      if (id) toast({ title: "Saved & marked sent" });
                    }}>Mark as sent</Button>
                    <Button variant="default" onClick={async () => {
                      const id = await saveLead("demo_booked", { message_sent_at: new Date().toISOString(), demo_booked_at: new Date().toISOString() });
                      if (id) toast({ title: "Booked!" });
                    }}>Booked demo</Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
