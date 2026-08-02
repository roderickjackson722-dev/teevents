import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Upload, Download, Mail, Phone, Pencil, Trash2, History, MessageCircle, CheckSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

type ContactType = "golfer" | "sponsor" | "vendor" | "volunteer";
type ResponseStatus = "pending" | "accepted" | "declined" | "maybe";

interface Contact {
  id: string;
  tournament_id: string;
  organization_id: string;
  contact_type: ContactType;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  invited: boolean;
  invited_at: string | null;
  response_status: ResponseStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface Comm {
  id: string;
  contact_id: string;
  communication_type: string;
  direction: string;
  subject: string | null;
  message: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface Task {
  id: string;
  tournament_id: string;
  contact_id: string | null;
  task_type: string;
  title: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface AuditEntry {
  id: string;
  contact_id: string;
  changed_by: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  golfer: "bg-blue-100 text-blue-800",
  sponsor: "bg-purple-100 text-purple-800",
  vendor: "bg-amber-100 text-amber-800",
  volunteer: "bg-emerald-100 text-emerald-800",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  maybe: "bg-yellow-100 text-yellow-800",
};

function emptyContact(tournamentId: string, organizationId: string): Contact {
  return {
    id: "",
    tournament_id: tournamentId,
    organization_id: organizationId,
    contact_type: "golfer",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    invited: false,
    invited_at: null,
    response_status: "pending",
    notes: "",
    created_at: new Date().toISOString(),
    created_by: null,
  };
}

export default function CRM() {
  const { org } = useOrgContext();
  const isOwner = !org || org.role === "owner";
  const permissions = org?.permissions || [];
  const canEdit = isOwner || permissions.includes("manage_messages") || permissions.includes("manage_registration");
  const canDelete = isOwner;

  const [tournamentId, setTournamentId] = useTournamentIdParam();
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string }>>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [viewing, setViewing] = useState<Contact | null>(null);

  // Load tournaments
  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setTournaments((data as any) || []);
        const rows = (data as any[]) || [];
        if (rows.length > 0 && !rows.some((t) => t.id === tournamentId)) {
          setTournamentId(rows[0].id);
        }
      });
  }, [org]); // eslint-disable-line

  const loadContacts = async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_contacts" as any)
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) toast({ title: "Failed to load contacts", description: error.message, variant: "destructive" });
    else setContacts((data as any) || []);
  };

  useEffect(() => { loadContacts(); }, [tournamentId]);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== "all" && c.contact_type !== typeFilter) return false;
      if (statusFilter !== "all" && c.response_status !== statusFilter) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${c.first_name} ${c.last_name} ${c.email ?? ""} ${c.company ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [contacts, q, typeFilter, statusFilter]);

  const handleSave = async (c: Contact) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Not signed in", variant: "destructive" }); return; }
    const payload: any = {
      tournament_id: c.tournament_id,
      organization_id: c.organization_id,
      contact_type: c.contact_type,
      first_name: c.first_name.trim(),
      last_name: c.last_name.trim(),
      email: c.email || null,
      phone: c.phone || null,
      company: c.company || null,
      title: c.title || null,
      invited: c.invited,
      invited_at: c.invited ? (c.invited_at || new Date().toISOString()) : null,
      response_status: c.response_status,
      notes: c.notes || null,
    };
    if (!payload.first_name || !payload.last_name) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    let err;
    if (c.id) {
      ({ error: err } = await supabase.from("crm_contacts" as any).update(payload).eq("id", c.id));
    } else {
      ({ error: err } = await supabase.from("crm_contacts" as any).insert({ ...payload, created_by: user.id }));
    }
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else {
      toast({ title: "Contact saved" });
      setEditing(null);
      loadContacts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact? This will also remove their communications and tasks.")) return;
    const { error } = await supabase.from("crm_contacts" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Contact deleted" }); loadContacts(); }
  };

  const exportCsv = () => {
    const headers = ["first_name","last_name","email","phone","company","title","contact_type","response_status","invited","notes"];
    const rows = filtered.map((c) =>
      headers.map((h) => {
        const v = (c as any)[h];
        const s = v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `crm-contacts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!tournamentId || !org) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) ?? [];
      const obj: any = {};
      headers.forEach((h, idx) => {
        const v = (cols[idx] ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
        obj[h] = v;
      });
      if (!obj.first_name || !obj.last_name) continue;
      rows.push({
        tournament_id: tournamentId,
        organization_id: org.orgId,
        contact_type: obj.contact_type || "golfer",
        first_name: obj.first_name,
        last_name: obj.last_name,
        email: obj.email || null,
        phone: obj.phone || null,
        company: obj.company || null,
        title: obj.title || null,
        response_status: obj.response_status || "pending",
        invited: obj.invited === "true" || obj.invited === "TRUE",
        notes: obj.notes || null,
        created_by: user.id,
      });
    }
    if (rows.length === 0) { toast({ title: "No valid rows found", variant: "destructive" }); return; }
    const { error } = await supabase.from("crm_contacts" as any).insert(rows);
    if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Imported ${rows.length} contacts` }); loadContacts(); }
  };

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-7xl">
      <SEO title="CRM" description="Track prospects, sponsors, vendors, and follow-ups for your tournament." />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM — Contact Management</h1>
          <p className="text-sm text-muted-foreground">Track prospects, log communications, manage tasks, and audit changes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tournamentId ?? ""} onValueChange={(v) => setTournamentId(v)}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select tournament..." /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && tournamentId && org && (
            <Button onClick={() => setEditing(emptyContact(tournamentId, org.orgId))}>
              <Plus className="w-4 h-4 mr-1" /> Add Contact
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name, email, company..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="golfer">Golfer</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> Export</Button>
            {canEdit && (
              <label className="inline-flex">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="w-4 h-4 mr-1" /> Import CSV</span>
                </Button>
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
              </label>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Invited</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No contacts. Click "Add Contact" to start.</td></tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 font-medium">
                      <button className="hover:underline" onClick={() => setViewing(c)}>{c.first_name} {c.last_name}</button>
                    </td>
                    <td className="p-2"><Badge className={TYPE_COLORS[c.contact_type]}>{c.contact_type}</Badge></td>
                    <td className="p-2 text-xs">{c.email || "—"}</td>
                    <td className="p-2 text-xs">{c.company || "—"}</td>
                    <td className="p-2"><Badge className={STATUS_COLORS[c.response_status]}>{c.response_status}</Badge></td>
                    <td className="p-2">{c.invited ? "✅" : "⏳"}</td>
                    <td className="p-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(c)}>View</Button>
                        {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="w-3 h-3" /></Button>}
                        {canDelete && <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <ContactEditor contact={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}

      {viewing && tournamentId && (
        <ContactDetailDrawer
          contact={viewing}
          onClose={() => { setViewing(null); loadContacts(); }}
          canEdit={canEdit}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}
    </div>
  );
}

function ContactEditor({ contact, onClose, onSave }: { contact: Contact; onClose: () => void; onSave: (c: Contact) => void }) {
  const [c, setC] = useState<Contact>(contact);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact.id ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>First name *</Label><Input value={c.first_name} onChange={(e) => setC({ ...c, first_name: e.target.value })} /></div>
            <div><Label>Last name *</Label><Input value={c.last_name} onChange={(e) => setC({ ...c, last_name: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Type</Label>
              <Select value={c.contact_type} onValueChange={(v: any) => setC({ ...c, contact_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="golfer">Golfer</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={c.response_status} onValueChange={(v: any) => setC({ ...c, response_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="maybe">Maybe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Email</Label><Input type="email" value={c.email ?? ""} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={c.phone ?? ""} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Company</Label><Input value={c.company ?? ""} onChange={(e) => setC({ ...c, company: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={c.title ?? ""} onChange={(e) => setC({ ...c, title: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input id="invited" type="checkbox" checked={c.invited} onChange={(e) => setC({ ...c, invited: e.target.checked })} />
            <Label htmlFor="invited" className="cursor-pointer">Marked as invited</Label>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={c.notes ?? ""} onChange={(e) => setC({ ...c, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(c)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDetailDrawer({ contact, onClose, canEdit, onEdit }: {
  contact: Contact; onClose: () => void; canEdit: boolean; onEdit: () => void;
}) {
  const [comms, setComms] = useState<Comm[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [logging, setLogging] = useState(false);
  const [newComm, setNewComm] = useState({ type: "email", direction: "outgoing", subject: "", message: "" });
  const [newTask, setNewTask] = useState({ type: "follow-up", title: "", due_date: "" });

  const load = async () => {
    const [{ data: c }, { data: t }, { data: a }] = await Promise.all([
      supabase.from("crm_communications" as any).select("*").eq("contact_id", contact.id).order("created_at", { ascending: false }),
      supabase.from("crm_tasks" as any).select("*").eq("contact_id", contact.id).order("due_date", { ascending: true }),
      supabase.from("crm_audit_log" as any).select("*").eq("contact_id", contact.id).order("changed_at", { ascending: false }).limit(50),
    ]);
    setComms((c as any) || []);
    setTasks((t as any) || []);
    setAudit((a as any) || []);
  };

  useEffect(() => { load(); }, [contact.id]); // eslint-disable-line

  const addComm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLogging(true);
    const { error } = await supabase.from("crm_communications" as any).insert({
      contact_id: contact.id,
      communication_type: newComm.type,
      direction: newComm.direction,
      subject: newComm.subject || null,
      message: newComm.message || null,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    });
    setLogging(false);
    if (error) toast({ title: "Failed to log", description: error.message, variant: "destructive" });
    else { setNewComm({ type: "email", direction: "outgoing", subject: "", message: "" }); load(); }
  };

  const addTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!newTask.title.trim()) { toast({ title: "Task title required", variant: "destructive" }); return; }
    const { error } = await supabase.from("crm_tasks" as any).insert({
      tournament_id: contact.tournament_id,
      contact_id: contact.id,
      task_type: newTask.type,
      title: newTask.title,
      due_date: newTask.due_date || null,
      status: "pending",
      created_by: user.id,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setNewTask({ type: "follow-up", title: "", due_date: "" }); load(); }
  };

  const toggleTask = async (t: Task) => {
    const next = t.status === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("crm_tasks" as any).update({
      status: next,
      completed_at: next === "completed" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{contact.first_name} {contact.last_name} — <span className="capitalize text-muted-foreground text-sm">{contact.contact_type}</span></span>
            {canEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {contact.email || "—"}</div>
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {contact.phone || "—"}</div>
          <div>Company: {contact.company || "—"}</div>
          <div>Title: {contact.title || "—"}</div>
          <div>Status: <Badge className={STATUS_COLORS[contact.response_status]}>{contact.response_status}</Badge></div>
          <div>Invited: {contact.invited_at ? new Date(contact.invited_at).toLocaleDateString() : (contact.invited ? "Yes" : "No")}</div>
        </div>

        {contact.notes && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Notes</div>
            {contact.notes}
          </div>
        )}

        <Tabs defaultValue="comms" className="mt-2">
          <TabsList>
            <TabsTrigger value="comms"><MessageCircle className="w-3 h-3 mr-1" /> Communications</TabsTrigger>
            <TabsTrigger value="tasks"><CheckSquare className="w-3 h-3 mr-1" /> Tasks</TabsTrigger>
            <TabsTrigger value="audit"><History className="w-3 h-3 mr-1" /> Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="comms" className="space-y-3">
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <Select value={newComm.type} onValueChange={(v) => setNewComm({ ...newComm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newComm.direction} onValueChange={(v) => setNewComm({ ...newComm, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                    <SelectItem value="incoming">Incoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Subject (optional)" value={newComm.subject} onChange={(e) => setNewComm({ ...newComm, subject: e.target.value })} />
              <Textarea rows={2} placeholder="What was discussed?" value={newComm.message} onChange={(e) => setNewComm({ ...newComm, message: e.target.value })} />
              <Button size="sm" onClick={addComm} disabled={logging}><Plus className="w-3 h-3 mr-1" /> Log Activity</Button>
            </div>
            <div className="space-y-2">
              {comms.length === 0 && <p className="text-sm text-muted-foreground italic">No communications logged.</p>}
              {comms.map((c) => (
                <div key={c.id} className="border-l-2 border-primary/40 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()} • {c.communication_type} • {c.direction}</div>
                  {c.subject && <div className="font-medium text-sm">{c.subject}</div>}
                  {c.message && <div className="text-sm whitespace-pre-wrap">{c.message}</div>}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3">
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
              </div>
              <Button size="sm" onClick={addTask}><Plus className="w-3 h-3 mr-1" /> Add Task</Button>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks.</p>}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 border rounded-md p-2">
                  <input type="checkbox" checked={t.status === "completed"} onChange={() => toggleTask(t)} />
                  <div className="flex-1">
                    <div className={`text-sm ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title || t.task_type}</div>
                    <div className="text-xs text-muted-foreground">{t.task_type}{t.due_date ? ` • Due ${new Date(t.due_date).toLocaleDateString()}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-2">
            {audit.length === 0 && <p className="text-sm text-muted-foreground italic">No changes recorded.</p>}
            {audit.map((a) => (
              <div key={a.id} className="text-xs border-l-2 border-muted pl-3 py-1">
                <div className="text-muted-foreground">{new Date(a.changed_at).toLocaleString()}</div>
                <div><span className="font-semibold">{a.field_name}</span>: <span className="text-muted-foreground">{a.old_value || "—"}</span> → <span>{a.new_value || "—"}</span></div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
