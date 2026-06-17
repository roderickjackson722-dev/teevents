import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bot, ExternalLink, Plus, Sparkles, Calendar } from "lucide-react";

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
  detected_setup: string | null;
  status: string;
  generated_message: string | null;
  message_sent_at: string | null;
  notes: string | null;
  calendly_link: string | null;
  created_at: string;
};

const STATUSES = ["new", "contacted", "responded", "demo_booked", "converted", "lost"] as const;

const statusColor = (s: string) => {
  switch (s) {
    case "new": return "bg-blue-100 text-blue-800";
    case "contacted": return "bg-amber-100 text-amber-800";
    case "responded": return "bg-purple-100 text-purple-800";
    case "demo_booked": return "bg-indigo-100 text-indigo-800";
    case "converted": return "bg-green-100 text-green-800";
    case "lost": return "bg-gray-200 text-gray-700";
    default: return "bg-gray-100 text-gray-700";
  }
};

const draftMessage = (l: Partial<Lead>) => {
  const name = l.organizer_name || "there";
  const event = l.tournament_name || "your upcoming tournament";
  const platform = l.detected_setup ? ` instead of ${l.detected_setup}` : "";
  return `Hi ${name},

I came across ${event} and wanted to reach out. We built TeeVents specifically for golf tournament organizers — registration, sponsors, live scoring, and payouts all in one branded site${platform}.

A few organizers have switched over and saved 10+ hours per event while increasing sponsor revenue. Would you be open to a quick 15-minute demo to see if it's a fit?

Book a time here: https://calendly.com/teevents/demo

Best,
The TeeVents Team`;
};

export default function AiSalesAgent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({ source: "manual", status: "new" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.tournament_name || ""} ${l.organizer_name || ""} ${l.contact_email || ""} ${l.location || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l) => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [leads]);

  const openLead = (l: Lead) => {
    setSelected(l);
    setDraft(l.generated_message || draftMessage(l));
    setNotes(l.notes || "");
  };

  const saveLead = async (patch: Partial<Lead>) => {
    if (!selected) return;
    const { error } = await supabase.from("sales_leads").update(patch).eq("id", selected.id);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await load();
    setSelected((prev) => prev ? { ...prev, ...patch } as Lead : prev);
    toast({ title: "Saved" });
  };

  const markContacted = async () => {
    await saveLead({
      generated_message: draft,
      notes,
      status: "contacted",
      message_sent_at: new Date().toISOString(),
    });
  };

  const updateStatus = async (status: string) => {
    await saveLead({ status });
  };

  const openCalendly = () => {
    const link = selected?.calendly_link || "https://calendly.com/teevents/demo";
    window.open(link, "_blank");
  };

  const addLead = async () => {
    if (!newLead.tournament_name) {
      toast({ title: "Event name required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("sales_leads").insert({
      source: newLead.source || "manual",
      tournament_name: newLead.tournament_name,
      organizer_name: newLead.organizer_name,
      event_date: newLead.event_date || null,
      location: newLead.location,
      contact_email: newLead.contact_email,
      source_url: newLead.source_url,
      detected_setup: newLead.detected_setup,
      status: "new",
    });
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setAddOpen(false);
    setNewLead({ source: "manual", status: "new" });
    await load();
    toast({ title: "Lead added" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> AI Sales Agent</h1>
              <p className="text-sm text-muted-foreground">Lead generation & outreach control center</p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[["Total", leads.length], ...STATUSES.map(s => [s, stats[s] || 0])].map(([label, val]) => (
            <Card key={String(label)}>
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground capitalize">{String(label).replace("_", " ")}</div>
                <div className="text-2xl font-bold">{val as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Input placeholder="Search event, organizer, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="eventbrite">Eventbrite</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 px-2">Source</th>
                    <th className="py-2 px-2">Event Name</th>
                    <th className="py-2 px-2">Organizer</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No leads. Add one to get started.</td></tr>
                  ) : filtered.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 capitalize">{l.source}</td>
                      <td className="py-2 px-2 font-medium">{l.tournament_name || "—"}</td>
                      <td className="py-2 px-2">{l.organizer_name || l.contact_email || "—"}</td>
                      <td className="py-2 px-2">{l.event_date || "—"}</td>
                      <td className="py-2 px-2"><Badge className={statusColor(l.status)}>{l.status.replace("_", " ")}</Badge></td>
                      <td className="py-2 px-2 text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => openLead(l)}>View</Button>
                        <Button size="sm" onClick={() => openLead(l)}><Sparkles className="h-3 w-3 mr-1" />Draft</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.tournament_name || "Lead"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground">Source</Label><div className="capitalize">{selected.source}</div></div>
                  <div><Label className="text-muted-foreground">Status</Label>
                    <Select value={selected.status} onValueChange={updateStatus}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-muted-foreground">Event Date</Label><div>{selected.event_date || "—"}</div></div>
                  <div><Label className="text-muted-foreground">Location</Label><div>{selected.location || "—"}</div></div>
                  <div><Label className="text-muted-foreground">Organizer</Label><div>{selected.organizer_name || "—"}</div></div>
                  <div><Label className="text-muted-foreground">Email</Label><div>{selected.contact_email || "—"}</div></div>
                  <div><Label className="text-muted-foreground">Current Platform</Label><div>{selected.detected_setup || "—"}</div></div>
                  <div>
                    <Label className="text-muted-foreground">Contact Link</Label>
                    {selected.source_url ? (
                      <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-primary flex items-center gap-1">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <div>—</div>}
                  </div>
                </div>

                <div>
                  <Label>AI Outreach Draft</Label>
                  <Textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" />
                  <Button size="sm" variant="ghost" className="mt-1" onClick={() => setDraft(draftMessage(selected))}>
                    <Sparkles className="h-3 w-3 mr-1" /> Regenerate draft
                  </Button>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up notes…" />
                </div>

                {selected.message_sent_at && (
                  <div className="text-xs text-muted-foreground">
                    Last contacted {new Date(selected.message_sent_at).toLocaleString()}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => saveLead({ generated_message: draft, notes })}>Save</Button>
                <Button variant="outline" onClick={openCalendly}><Calendar className="h-4 w-4 mr-1" /> Schedule Demo</Button>
                <Button onClick={markContacted}>Mark as Contacted</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Lead Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Source</Label>
              <Select value={newLead.source} onValueChange={(v) => setNewLead({ ...newLead, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eventbrite">Eventbrite</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Event Name *</Label><Input value={newLead.tournament_name || ""} onChange={(e) => setNewLead({ ...newLead, tournament_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Event Date</Label><Input type="date" value={newLead.event_date || ""} onChange={(e) => setNewLead({ ...newLead, event_date: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={newLead.location || ""} onChange={(e) => setNewLead({ ...newLead, location: e.target.value })} /></div>
            </div>
            <div><Label>Organizer Name</Label><Input value={newLead.organizer_name || ""} onChange={(e) => setNewLead({ ...newLead, organizer_name: e.target.value })} /></div>
            <div><Label>Organizer Email</Label><Input type="email" value={newLead.contact_email || ""} onChange={(e) => setNewLead({ ...newLead, contact_email: e.target.value })} /></div>
            <div><Label>Contact URL</Label><Input value={newLead.source_url || ""} onChange={(e) => setNewLead({ ...newLead, source_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Current Platform</Label><Input value={newLead.detected_setup || ""} onChange={(e) => setNewLead({ ...newLead, detected_setup: e.target.value })} placeholder="eventbrite, google forms…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addLead}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
