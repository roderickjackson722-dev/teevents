import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Calendar, MapPin, Loader2, Users, Mail, Send,
  FileText, Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, School, Save, X, Globe, RefreshCw, Pencil, ClipboardList,
} from "lucide-react";

interface RegistrationField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  editable: boolean;
  options?: string[];
}

interface CollegeTournament {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  course_name: string | null;
  status: string;
  registration_open: boolean;
  contact_email: string | null;
  created_at: string;
  registration_fields: RegistrationField[] | null;
}

interface Invitation {
  id: string;
  tournament_id: string;
  coach_name: string;
  coach_email: string;
  school_name: string;
  status: string;
  rsvp_response: string | null;
  rsvp_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Registration {
  id: string;
  tournament_id: string;
  coach_name: string;
  coach_email: string;
  school_name: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  players?: Player[];
}

interface Player {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  year: string | null;
  handicap: number | null;
}

interface TournamentTab {
  id: string;
  tournament_id: string;
  title: string;
  content_type: string;
  content: string | null;
  file_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

const DEFAULT_TABS = [
  { title: "Schedule", content_type: "rich_text" },
  { title: "Teams", content_type: "structured" },
  { title: "Yardages", content_type: "file" },
  { title: "Rules", content_type: "rich_text" },
  { title: "Pin Sheets", content_type: "file" },
];

const CollegeTournamentHub = () => {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<CollegeTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [form, setForm] = useState({
    title: "", description: "", start_date: "", end_date: "",
    location: "", course_name: "", contact_email: "info@teevents.golf",
  });

  // Sub-data for expanded tournament
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tabs, setTabs] = useState<TournamentTab[]>([]);
  const [activeSubTab, setActiveSubTab] = useState("invitations");

  // Invite form
  const [inviteForm, setInviteForm] = useState({ coach_name: "", coach_email: "", school_name: "" });
  const [bulkInvites, setBulkInvites] = useState("");

  // Tab editing
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editTabContent, setEditTabContent] = useState("");

  // Add tab form
  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabType, setNewTabType] = useState("rich_text");

  // Registration fields editing
  const [regFields, setRegFields] = useState<RegistrationField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState("");
  const [editFieldType, setEditFieldType] = useState("text");
  const [editFieldRequired, setEditFieldRequired] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<CollegeTournament | null>(null);

  const fetchTournaments = async () => {
    const { data } = await supabase
      .from("college_tournaments")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setTournaments(data || []);
    setLoading(false);
  };

  const fetchTournamentData = async (tournamentId: string) => {
    const [invRes, regRes, tabRes] = await Promise.all([
      supabase.from("college_tournament_invitations").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }) as any,
      supabase.from("college_tournament_registrations").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }) as any,
      supabase.from("college_tournament_tabs").select("*").eq("tournament_id", tournamentId).order("sort_order", { ascending: true }) as any,
    ]);
    setInvitations(invRes.data || []);

    // Fetch players for each registration
    const regs = regRes.data || [];
    if (regs.length > 0) {
      const { data: players } = await supabase
        .from("college_tournament_players")
        .select("*")
        .in("registration_id", regs.map((r: any) => r.id)) as any;
      const playersByReg = (players || []).reduce((acc: any, p: any) => {
        if (!acc[p.registration_id]) acc[p.registration_id] = [];
        acc[p.registration_id].push(p);
        return acc;
      }, {});
      setRegistrations(regs.map((r: any) => ({ ...r, players: playersByReg[r.id] || [] })));
    } else {
      setRegistrations([]);
    }

    setTabs(tabRes.data || []);

    // Load registration fields for this tournament
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament?.registration_fields) {
      setRegFields(tournament.registration_fields);
    } else {
      setRegFields([
        { id: "school_name", label: "School Name", type: "text", required: true, editable: false },
        { id: "coach_name", label: "Head Coach Name", type: "text", required: true, editable: false },
        { id: "coach_email", label: "Coach Email", type: "email", required: true, editable: false },
        { id: "notes", label: "Notes", type: "text", required: false, editable: true },
      ]);
    }
  };

  useEffect(() => { fetchTournaments(); }, []);

  useEffect(() => {
    if (expandedId) fetchTournamentData(expandedId);
  }, [expandedId, tournaments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await supabase.from("college_tournaments").insert({
      title: form.title,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      course_name: form.course_name || null,
      contact_email: form.contact_email || "info@teevents.golf",
    } as any).select().single() as any;

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Create default tabs
      const defaultTabs = DEFAULT_TABS.map((t, i) => ({
        tournament_id: data.id,
        title: t.title,
        content_type: t.content_type,
        sort_order: i,
      }));
      await supabase.from("college_tournament_tabs").insert(defaultTabs as any);

      toast({ title: "College tournament created!", description: "Default tabs have been added." });
      setForm({ title: "", description: "", start_date: "", end_date: "", location: "", course_name: "", contact_email: "info@teevents.golf" });
      setCreateOpen(false);
      fetchTournaments();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("college_tournaments").delete().eq("id", deleteTarget.id) as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `"${deleteTarget.title}" has been removed.` });
      if (expandedId === deleteTarget.id) setExpandedId(null);
      fetchTournaments();
    }
    setDeleteTarget(null);
  };

  const toggleStatus = async (t: CollegeTournament) => {
    const newStatus = t.status === "active" ? "draft" : "active";
    await supabase.from("college_tournaments").update({ status: newStatus } as any).eq("id", t.id);
    fetchTournaments();
    toast({ title: newStatus === "active" ? "Published!" : "Unpublished" });
  };

  const toggleRegistration = async (t: CollegeTournament) => {
    await supabase.from("college_tournaments").update({ registration_open: !t.registration_open } as any).eq("id", t.id);
    fetchTournaments();
    toast({ title: !t.registration_open ? "Registration opened" : "Registration closed" });
  };

  // Invitations
  const [sendingEmails, setSendingEmails] = useState(false);

  const sendInvitation = async () => {
    if (!expandedId || !inviteForm.coach_name || !inviteForm.coach_email || !inviteForm.school_name) return;
    const { data, error } = await supabase.from("college_tournament_invitations").insert({
      tournament_id: expandedId,
      coach_name: inviteForm.coach_name,
      coach_email: inviteForm.coach_email,
      school_name: inviteForm.school_name,
      status: "pending",
    } as any).select().single() as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Send email immediately
      await sendInvitationEmails([data.id]);
      toast({ title: "Invitation created & email sent" });
      setInviteForm({ coach_name: "", coach_email: "", school_name: "" });
      fetchTournamentData(expandedId);
    }
  };

  const sendInvitationEmails = async (invitationIds: string[]) => {
    if (!expandedId) return;
    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-college-invitation", {
        body: { invitation_ids: invitationIds, tournament_id: expandedId },
      });
      if (error) throw error;
      toast({ title: `${data.sent} invitation email(s) sent` });
      fetchTournamentData(expandedId);
    } catch (err: any) {
      toast({ title: "Email send failed", description: err.message, variant: "destructive" });
    }
    setSendingEmails(false);
  };

  const sendAllInvitationEmails = async () => {
    const unsent = invitations.filter(i => i.status !== "sent" || !i.rsvp_response);
    if (unsent.length === 0) {
      toast({ title: "All invitations already sent" });
      return;
    }
    await sendInvitationEmails(unsent.map(i => i.id));
  };

  const bulkSendInvitations = async () => {
    if (!expandedId || !bulkInvites.trim()) return;
    const lines = bulkInvites.trim().split("\n").filter(l => l.trim());
    const entries = lines.map(line => {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length >= 3) {
        return { school_name: parts[0], coach_name: parts[1], coach_email: parts[2] };
      }
      return null;
    }).filter(Boolean);

    if (!entries.length) {
      toast({ title: "Invalid format", description: "Use: School Name, Coach Name, Email", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase.from("college_tournament_invitations").insert(
      entries.map(e => ({ tournament_id: expandedId, ...e, status: "pending" })) as any
    ).select() as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Send emails for all new invitations
      if (data && data.length > 0) {
        await sendInvitationEmails(data.map((d: any) => d.id));
      }
      toast({ title: `${entries.length} invitations created & emails sent` });
      setBulkInvites("");
      fetchTournamentData(expandedId);
    }
  };

  const deleteInvitation = async (id: string) => {
    await supabase.from("college_tournament_invitations").delete().eq("id", id) as any;
    if (expandedId) fetchTournamentData(expandedId);
  };

  // Tabs
  const addTab = async () => {
    if (!expandedId || !newTabTitle.trim()) return;
    await supabase.from("college_tournament_tabs").insert({
      tournament_id: expandedId,
      title: newTabTitle.trim(),
      content_type: newTabType,
      sort_order: tabs.length,
    } as any);
    setNewTabTitle("");
    fetchTournamentData(expandedId);
    toast({ title: "Tab added" });
  };

  const saveTabContent = async (tabId: string) => {
    await supabase.from("college_tournament_tabs").update({ content: editTabContent } as any).eq("id", tabId);
    setEditingTab(null);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Content saved" });
  };

  const toggleTabVisibility = async (tab: TournamentTab) => {
    await supabase.from("college_tournament_tabs").update({ is_visible: !tab.is_visible } as any).eq("id", tab.id);
    if (expandedId) fetchTournamentData(expandedId);
  };

  const deleteTab = async (id: string) => {
    await supabase.from("college_tournament_tabs").delete().eq("id", id) as any;
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Tab removed" });
  };

  const handleFileUpload = async (tabId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `college/${expandedId}/${tabId}.${ext}`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    await supabase.from("college_tournament_tabs").update({ file_url: publicUrl } as any).eq("id", tabId);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "File uploaded" });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <School className="h-5 w-5 text-primary" />
            College Golf Tournament Hub
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage college golf tournaments with invitations, RSVP tracking, and event pages.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New College Tournament</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Create College Tournament</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <Input placeholder="Tournament Name *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                  <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                  <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} min={form.start_date || undefined} />
                </div>
              </div>
              <Input placeholder="Golf Course" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} />
              <Input placeholder="Location (City, State)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Input placeholder="Contact Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              <p className="text-xs text-muted-foreground">Default tabs (Schedule, Teams, Yardages, Rules, Pin Sheets) will be created automatically.</p>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Tournament
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete College Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>"{deleteTarget?.title}"</strong> and all associated invitations, registrations, and tab content?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tournament List */}
      {tournaments.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <School className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold mb-2">No college tournaments yet</h3>
          <p className="text-muted-foreground mb-6">Create your first college golf tournament to get started.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Tournament</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="bg-card rounded-lg border border-border overflow-hidden">
                {/* Tournament Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{t.status}</span>
                      <h3 className="font-display font-semibold text-lg">{t.title}</h3>
                      {t.course_name && <span className="text-xs text-muted-foreground">{t.course_name}</span>}
                      {t.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>}
                      {t.start_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {t.end_date && t.end_date !== t.start_date && ` – ${new Date(t.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </span>
                      )}
                      {t.registration_open && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">Registration Open</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "active" && (t as any).slug && (
                        <a href={`/college/${(t as any).slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                          <Globe className="h-3.5 w-3.5" /> View Page
                        </a>
                      )}
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(t)}>
                        {t.status === "active" ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                        {t.status === "active" ? "Unpublish" : "Publish"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleRegistration(t)}>
                        {t.registration_open ? "Close Reg" : "Open Reg"}
                      </Button>
                      <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                      <button onClick={() => setDeleteTarget(t)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/20">
                    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="invitations">
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Invitations ({invitations.length})
                        </TabsTrigger>
                        <TabsTrigger value="registrations">
                          <Users className="h-3.5 w-3.5 mr-1.5" /> Registrations ({registrations.length})
                        </TabsTrigger>
                        <TabsTrigger value="tabs">
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> Event Tabs ({tabs.length})
                        </TabsTrigger>
                      </TabsList>

                      {/* Invitations Tab */}
                      <TabsContent value="invitations" className="space-y-4">
                        {/* Single Invite */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3">Send Invitation</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Input placeholder="School Name" value={inviteForm.school_name} onChange={e => setInviteForm({ ...inviteForm, school_name: e.target.value })} className="flex-1 min-w-[150px]" />
                            <Input placeholder="Coach Name" value={inviteForm.coach_name} onChange={e => setInviteForm({ ...inviteForm, coach_name: e.target.value })} className="flex-1 min-w-[150px]" />
                            <Input placeholder="Coach Email" value={inviteForm.coach_email} onChange={e => setInviteForm({ ...inviteForm, coach_email: e.target.value })} className="flex-1 min-w-[200px]" />
                            <Button onClick={sendInvitation}><Send className="h-4 w-4 mr-1" /> Invite</Button>
                          </div>
                        </div>

                        {/* Bulk Invite */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-2">Bulk Import Invitations</h4>
                          <p className="text-xs text-muted-foreground mb-3">One per line: <code className="bg-muted px-1 rounded">School Name, Coach Name, Email</code></p>
                          <Textarea
                            placeholder={"Texas A&M, John Smith, john@tamu.edu\nOklahoma State, Jane Doe, jane@okstate.edu"}
                            value={bulkInvites}
                            onChange={e => setBulkInvites(e.target.value)}
                            className="min-h-[80px] text-sm mb-3"
                          />
                          <Button onClick={bulkSendInvitations} size="sm"><Plus className="h-4 w-4 mr-1" /> Import All</Button>
                        </div>

                        {/* Invitation List */}
                        {invitations.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-end mb-2">
                              <Button size="sm" variant="outline" onClick={sendAllInvitationEmails} disabled={sendingEmails}>
                                {sendingEmails ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                                Send All Emails
                              </Button>
                            </div>
                            {invitations.map(inv => (
                              <div key={inv.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    inv.rsvp_response === "accepted" ? "bg-primary/10 text-primary" :
                                    inv.rsvp_response === "declined" ? "bg-destructive/10 text-destructive" :
                                    inv.status === "sent" ? "bg-secondary/10 text-secondary" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    {inv.rsvp_response || inv.status}
                                  </span>
                                  <span className="font-medium text-sm">{inv.school_name}</span>
                                  <span className="text-xs text-muted-foreground">{inv.coach_name}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{inv.coach_email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => sendInvitationEmails([inv.id])} className="text-muted-foreground hover:text-primary transition-colors" title="Resend invitation email">
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => deleteInvitation(inv.id)} className="text-muted-foreground hover:text-destructive" title="Delete invitation">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic py-4 text-center">No invitations sent yet.</p>
                        )}
                      </TabsContent>

                      {/* Registrations Tab */}
                      <TabsContent value="registrations" className="space-y-4">
                        {registrations.length > 0 ? (
                          registrations.map(reg => (
                            <div key={reg.id} className="bg-card rounded-lg border border-border p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <School className="h-5 w-5 text-primary" />
                                  <div>
                                    <h4 className="font-semibold">{reg.school_name}</h4>
                                    <p className="text-xs text-muted-foreground">{reg.coach_name} · {reg.coach_email}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  reg.payment_status === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                }`}>
                                  {reg.payment_status}
                                </span>
                              </div>
                              {reg.players && reg.players.length > 0 ? (
                                <div className="border-t border-border pt-3">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Roster ({reg.players.length} players)</h5>
                                  <div className="grid gap-1">
                                    {reg.players.map(p => (
                                      <div key={p.id} className="flex items-center gap-3 text-sm">
                                        <span className="font-medium">{p.first_name} {p.last_name}</span>
                                        {p.year && <span className="text-xs text-muted-foreground capitalize">{p.year}</span>}
                                        {p.handicap !== null && <span className="text-xs text-muted-foreground">HCP: {p.handicap}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No players listed yet.</p>
                              )}
                              {reg.notes && <p className="text-xs text-muted-foreground mt-2 italic">Note: {reg.notes}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic py-4 text-center">No registrations yet.</p>
                        )}
                      </TabsContent>

                      {/* Event Tabs Management */}
                      <TabsContent value="tabs" className="space-y-4">
                        {tabs.map(tab => (
                          <div key={tab.id} className="bg-card rounded-lg border border-border p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{tab.title}</h4>
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                                  {tab.content_type.replace("_", " ")}
                                </span>
                                {!tab.is_visible && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Hidden</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleTabVisibility(tab)} className="text-muted-foreground hover:text-foreground" title={tab.is_visible ? "Hide tab" : "Show tab"}>
                                  {tab.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                                <button onClick={() => deleteTab(tab.id)} className="text-muted-foreground hover:text-destructive" title="Delete tab">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {tab.content_type === "file" ? (
                              <div className="space-y-2">
                                {tab.file_url && (
                                  <a href={tab.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" /> View uploaded file
                                  </a>
                                )}
                                <Input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                  onChange={e => { if (e.target.files?.[0]) handleFileUpload(tab.id, e.target.files[0]); }}
                                  className="text-sm"
                                />
                              </div>
                            ) : (
                              <div>
                                {editingTab === tab.id ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editTabContent}
                                      onChange={e => setEditTabContent(e.target.value)}
                                      placeholder="Enter content..."
                                      className="min-h-[120px] text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => saveTabContent(tab.id)}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingTab(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {tab.content ? (
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{tab.content}</p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">No content yet.</p>
                                    )}
                                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditingTab(tab.id); setEditTabContent(tab.content || ""); }}>
                                      Edit Content
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add New Tab */}
                        <div className="bg-card rounded-lg border border-dashed border-border p-4">
                          <h4 className="font-semibold text-sm mb-3">Add Custom Tab</h4>
                          <div className="flex gap-2 flex-wrap">
                            <Input placeholder="Tab Title" value={newTabTitle} onChange={e => setNewTabTitle(e.target.value)} className="flex-1 min-w-[150px]" />
                            <select
                              value={newTabType}
                              onChange={e => setNewTabType(e.target.value)}
                              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="rich_text">Rich Text</option>
                              <option value="file">File Upload</option>
                              <option value="structured">Structured Data</option>
                            </select>
                            <Button onClick={addTab}><Plus className="h-4 w-4 mr-1" /> Add Tab</Button>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollegeTournamentHub;
