import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sharePreviewUrl } from "@/lib/shareLinks";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, sanitizeHtml } from "@/components/ui/rich-text-editor";
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
  FileText, Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, School, Save, X, Globe, RefreshCw, Pencil, ClipboardList, Upload, Image, Settings, Download, Sliders, Archive, ArchiveRestore,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
  hero_tagline: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  course_name: string | null;
  status: string;
  registration_open: boolean;
  contact_email: string | null;
  created_at: string;
  registration_fields: RegistrationField[] | null;
  flyer_url: string | null;
  slug: string | null;
  hero_image_url: string | null;
  hero_overlay_opacity: number | null;
  overview_visible?: boolean | null;
  archived_at?: string | null;
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
  position: string | null;
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
  const [activeSubTab, setActiveSubTab] = useState("page-settings");

  // Invite form
  const [inviteForm, setInviteForm] = useState({ coach_name: "", coach_email: "", school_name: "" });
  const [bulkInvites, setBulkInvites] = useState("");

  // Tab editing
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editTabContent, setEditTabContent] = useState("");

  // Overview tab editing (built-in, edits tournament.description)
  const [editingOverview, setEditingOverview] = useState(false);
  const [editOverviewContent, setEditOverviewContent] = useState("");

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

  // Delete confirmations
  const [deleteTarget, setDeleteTarget] = useState<CollegeTournament | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<CollegeTournament | null>(null);
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [deleteRegTarget, setDeleteRegTarget] = useState<Registration | null>(null);
  const [deletePlayerTarget, setDeletePlayerTarget] = useState<Player | null>(null);
  const [deleteInvTarget, setDeleteInvTarget] = useState<Invitation | null>(null);

  // Editing registrations
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editRegForm, setEditRegForm] = useState({ coach_name: "", coach_email: "", school_name: "", notes: "" });
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerForm, setEditPlayerForm] = useState({ first_name: "", last_name: "", year: "", position: "" });

  // Inline tournament editing
  const [editingTournament, setEditingTournament] = useState<string | null>(null);
  const [editTournamentForm, setEditTournamentForm] = useState({
    title: "", description: "", hero_tagline: "", start_date: "", end_date: "",
    location: "", course_name: "", contact_email: "", slug: "",
  });
  const [uploadingHero, setUploadingHero] = useState(false);

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
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast({ title: "Confirmation required", description: 'Type DELETE to permanently remove this tournament.', variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("college_tournaments").delete().eq("id", deleteTarget.id) as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `"${deleteTarget.title}" has been permanently removed.` });
      if (expandedId === deleteTarget.id) setExpandedId(null);
      fetchTournaments();
    }
    setDeleteTarget(null);
    setDeleteConfirmText("");
  };

  const archiveTournament = async () => {
    if (!archiveTarget) return;
    const { error } = await supabase.from("college_tournaments")
      .update({ archived_at: new Date().toISOString() } as any)
      .eq("id", archiveTarget.id) as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Archived", description: `"${archiveTarget.title}" moved to archive.` });
      if (expandedId === archiveTarget.id) setExpandedId(null);
      fetchTournaments();
    }
    setArchiveTarget(null);
  };

  const restoreTournament = async (t: CollegeTournament) => {
    const { error } = await supabase.from("college_tournaments")
      .update({ archived_at: null } as any)
      .eq("id", t.id) as any;
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Restored", description: `"${t.title}" restored to active tournaments.` });
      fetchTournaments();
    }
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
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

  const handleFlyerUpload = async (file: File) => {
    if (!expandedId) return;
    setUploadingFlyer(true);
    const ext = file.name.split(".").pop();
    const path = `college/${expandedId}/flyer.${ext}`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingFlyer(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    await supabase.from("college_tournaments").update({ flyer_url: publicUrl } as any).eq("id", expandedId);
    fetchTournaments();
    toast({ title: "Flyer uploaded successfully" });
    setUploadingFlyer(false);
  };

  const removeFlyer = async () => {
    if (!expandedId) return;
    await supabase.from("college_tournaments").update({ flyer_url: null } as any).eq("id", expandedId);
    fetchTournaments();
    toast({ title: "Flyer removed" });
  };

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

  const deleteInvitation = async () => {
    if (!deleteInvTarget) return;
    await supabase.from("college_tournament_invitations").delete().eq("id", deleteInvTarget.id) as any;
    setDeleteInvTarget(null);
    if (expandedId) fetchTournamentData(expandedId);
  };

  // Registration CRUD
  const startEditReg = (reg: Registration) => {
    setEditingRegId(reg.id);
    setEditRegForm({ coach_name: reg.coach_name, coach_email: reg.coach_email, school_name: reg.school_name, notes: reg.notes || "" });
  };

  const saveEditReg = async () => {
    if (!editingRegId) return;
    await supabase.from("college_tournament_registrations").update({
      coach_name: editRegForm.coach_name,
      coach_email: editRegForm.coach_email,
      school_name: editRegForm.school_name,
      notes: editRegForm.notes || null,
    } as any).eq("id", editingRegId);
    setEditingRegId(null);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Registration updated" });
  };

  const deleteRegistration = async () => {
    if (!deleteRegTarget) return;
    // Delete players first, then registration
    await supabase.from("college_tournament_players").delete().eq("registration_id", deleteRegTarget.id) as any;
    await supabase.from("college_tournament_registrations").delete().eq("id", deleteRegTarget.id) as any;
    setDeleteRegTarget(null);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Team registration deleted" });
  };

  // Player CRUD
  const startEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setEditPlayerForm({ first_name: p.first_name, last_name: p.last_name, year: p.year || "", position: p.position || "" });
  };

  const saveEditPlayer = async () => {
    if (!editingPlayerId) return;
    await supabase.from("college_tournament_players").update({
      first_name: editPlayerForm.first_name,
      last_name: editPlayerForm.last_name,
      year: editPlayerForm.year || null,
      position: editPlayerForm.position || null,
    } as any).eq("id", editingPlayerId);
    setEditingPlayerId(null);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Player updated" });
  };

  const deletePlayer = async () => {
    if (!deletePlayerTarget) return;
    await supabase.from("college_tournament_players").delete().eq("id", deletePlayerTarget.id) as any;
    setDeletePlayerTarget(null);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Player removed" });
  };

  // Overview tab (built-in) actions
  const currentTournament = () => tournaments.find(t => t.id === expandedId);

  const saveOverviewContent = async () => {
    if (!expandedId) return;
    await supabase.from("college_tournaments").update({ description: editOverviewContent } as any).eq("id", expandedId);
    setEditingOverview(false);
    await fetchTournaments();
    toast({ title: "Overview saved" });
  };

  const toggleOverviewVisibility = async () => {
    const t = currentTournament();
    if (!t) return;
    const next = !(t.overview_visible ?? true);
    await supabase.from("college_tournaments").update({ overview_visible: next } as any).eq("id", t.id);
    await fetchTournaments();
    toast({ title: next ? "Overview tab shown" : "Overview tab hidden" });
  };

  // Tabs

  const addTab = async () => {
    if (!expandedId || !newTabTitle.trim()) return;
    const isBookings = newTabType === "bookings";
    await supabase.from("college_tournament_tabs").insert({
      tournament_id: expandedId,
      title: newTabTitle.trim(),
      content_type: newTabType,
      content: isBookings ? `college-hub:${expandedId}` : null,
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

  const reorderTabs = async (result: DropResult) => {
    if (!result.destination || !expandedId) return;
    const next = Array.from(tabs);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setTabs(next);

    const updates = next.map((tab, i) =>
      supabase.from("college_tournament_tabs").update({ sort_order: i } as any).eq("id", tab.id)
    );
    await Promise.all(updates);
    if (expandedId) fetchTournamentData(expandedId);
    toast({ title: "Tab order saved" });
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

  // Registration Fields CRUD
  const saveRegFields = async (fields: RegistrationField[]) => {
    if (!expandedId) return;
    await supabase.from("college_tournaments").update({ registration_fields: fields } as any).eq("id", expandedId);
    setRegFields(fields);
    fetchTournaments();
    toast({ title: "Registration fields saved" });
  };

  const addRegField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: RegistrationField = {
      id: `custom_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      editable: true,
    };
    const updated = [...regFields, newField];
    saveRegFields(updated);
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
  };

  const removeRegField = (fieldId: string) => {
    const updated = regFields.filter(f => f.id !== fieldId);
    saveRegFields(updated);
  };

  const startEditRegField = (field: RegistrationField) => {
    setEditingFieldId(field.id);
    setEditFieldLabel(field.label);
    setEditFieldType(field.type);
    setEditFieldRequired(field.required);
  };

  const saveEditRegField = () => {
    if (!editingFieldId) return;
    const updated = regFields.map(f =>
      f.id === editingFieldId
        ? { ...f, label: editFieldLabel.trim(), type: editFieldType, required: editFieldRequired }
        : f
    );
    saveRegFields(updated);
    setEditingFieldId(null);
  };

  // Inline tournament editing
  const startEditTournament = (t: CollegeTournament) => {
    setEditingTournament(t.id);
    setEditTournamentForm({
      title: t.title, description: t.description || "", hero_tagline: (t as any).hero_tagline || "",
      start_date: t.start_date || "",
      end_date: t.end_date || "", location: t.location || "", course_name: t.course_name || "",
      contact_email: t.contact_email || "", slug: (t as any).slug || "",
    });
  };

  const saveTournamentEdit = async () => {
    if (!editingTournament) return;
    const { error } = await supabase.from("college_tournaments").update({
      title: editTournamentForm.title,
      description: editTournamentForm.description || null,
      hero_tagline: editTournamentForm.hero_tagline || null,
      start_date: editTournamentForm.start_date || null,
      end_date: editTournamentForm.end_date || null,
      location: editTournamentForm.location || null,
      course_name: editTournamentForm.course_name || null,
      contact_email: editTournamentForm.contact_email || null,
      slug: editTournamentForm.slug || null,
    } as any).eq("id", editingTournament);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tournament updated" });
      setEditingTournament(null);
      fetchTournaments();
    }
  };

  const deleteHeroObjects = async (tournamentId: string) => {
    // Remove every previously uploaded hero file for this tournament so old
    // cached CDN copies can never be served again.
    const { data: existing } = await supabase.storage
      .from("tournament-assets")
      .list(`college/${tournamentId}`, { limit: 100 });
    const stale = (existing || [])
      .filter((f) => f.name.startsWith("hero"))
      .map((f) => `college/${tournamentId}/${f.name}`);
    if (stale.length) {
      await supabase.storage.from("tournament-assets").remove(stale);
    }
  };

  const handleHeroUpload = async (tournamentId: string, file: File) => {
    setUploadingHero(true);
    await deleteHeroObjects(tournamentId);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `college/${tournamentId}/hero-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("tournament-assets")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || undefined });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingHero(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    const bustedUrl = `${publicUrl}?v=${Date.now()}`;
    await supabase.from("college_tournaments").update({ hero_image_url: bustedUrl } as any).eq("id", tournamentId);
    await fetchTournaments();
    toast({ title: "Hero image uploaded" });
    setUploadingHero(false);
  };

  const removeHeroImage = async (tournamentId: string) => {
    await deleteHeroObjects(tournamentId);
    await supabase.from("college_tournaments").update({ hero_image_url: null } as any).eq("id", tournamentId);
    await fetchTournaments();
    toast({ title: "Hero image removed (default will be used)" });
  };


  const updateOverlayOpacity = async (tournamentId: string, value: number) => {
    await supabase.from("college_tournaments").update({ hero_overlay_opacity: value } as any).eq("id", tournamentId);
    fetchTournaments();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <School className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">College Golf Tournament Hub</span>
          </h2>
          <p className="text-sm text-muted-foreground">Create and manage college golf tournaments with invitations, RSVP tracking, and event pages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`px-3 py-1.5 ${viewMode === "active" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >Active</button>
            <button
              type="button"
              onClick={() => setViewMode("archived")}
              className={`px-3 py-1.5 border-l border-border inline-flex items-center gap-1 ${viewMode === "archived" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            ><Archive className="h-3 w-3" /> Archive</button>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/college-hub/bookings"><Calendar className="h-4 w-4 mr-2" />Bookings</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/college-hub/surveys"><FileText className="h-4 w-4 mr-2" />Surveys</a>
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Tournament</Button>
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
      </div>


      {/* Delete Confirmation (typed) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanently Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will <strong>permanently delete</strong> <strong>"{deleteTarget?.title}"</strong> and all associated invitations, registrations, tabs and roster data. This cannot be undone.
                </p>
                <p className="text-xs text-muted-foreground">
                  Prefer to keep a copy? Cancel and use <strong>Archive</strong> instead — archived tournaments are hidden from the main list but can be restored later.
                </p>
                <div>
                  <label className="text-xs font-medium block mb-1">Type <span className="font-mono text-destructive">DELETE</span> to confirm:</label>
                  <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="DELETE" autoFocus />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={o => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>"{archiveTarget?.title}"</strong> to the archive? It will be hidden from the main list but all data is preserved and you can restore it anytime from the Archive tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveTournament}>
              <Archive className="h-4 w-4 mr-2" /> Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* Delete Invitation Confirmation */}
      <AlertDialog open={!!deleteInvTarget} onOpenChange={o => { if (!o) setDeleteInvTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the invitation for <strong>{deleteInvTarget?.school_name}</strong> ({deleteInvTarget?.coach_name})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteInvitation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Registration Confirmation */}
      <AlertDialog open={!!deleteRegTarget} onOpenChange={o => { if (!o) setDeleteRegTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Team Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the registration for <strong>{deleteRegTarget?.school_name}</strong> and all their roster players? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRegistration} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Player Confirmation */}
      <AlertDialog open={!!deletePlayerTarget} onOpenChange={o => { if (!o) setDeletePlayerTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Remove Player</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deletePlayerTarget?.first_name} {deletePlayerTarget?.last_name}</strong> from the roster? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlayer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Remove Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tournament List */}
      {(() => {
        const visibleTournaments = tournaments.filter(t =>
          viewMode === "archived" ? !!t.archived_at : !t.archived_at
        );
        if (visibleTournaments.length === 0) {
          return (
            <div className="text-center py-16 bg-card rounded-lg border border-border">
              {viewMode === "archived" ? (
                <>
                  <Archive className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-display font-bold mb-2">No archived tournaments</h3>
                  <p className="text-muted-foreground mb-6">Archived tournaments will appear here and can be restored anytime.</p>
                  <Button variant="outline" onClick={() => setViewMode("active")}>Back to Active</Button>
                </>
              ) : (
                <>
                  <School className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-display font-bold mb-2">No college tournaments yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first college golf tournament to get started.</p>
                  <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Tournament</Button>
                </>
              )}
            </div>
          );
        }
        return (
        <div className="space-y-3">
          {visibleTournaments.map(t => {
            const isExpanded = expandedId === t.id;
            const isArchived = !!t.archived_at;
            return (
              <div key={t.id} className={`bg-card rounded-lg border overflow-hidden ${isArchived ? "border-dashed border-muted-foreground/30 opacity-90" : "border-border"}`}>
                {/* Tournament Header */}
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isArchived
                          ? "bg-muted text-muted-foreground"
                          : t.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{isArchived ? "archived" : t.status}</span>
                      <h3 className="font-display font-semibold text-base sm:text-lg break-words">{t.title}</h3>
                      {t.course_name && <span className="text-xs text-muted-foreground w-full sm:w-auto">{t.course_name}</span>}
                      {t.location && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>}
                      {t.start_date && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {t.end_date && t.end_date !== t.start_date && ` – ${new Date(t.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                        </span>
                      )}
                      {!isArchived && t.registration_open && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">Registration Open</span>}
                      {isArchived && t.archived_at && (
                        <span className="text-xs text-muted-foreground italic">Archived {new Date(t.archived_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:shrink-0">
                      {!isArchived && t.status === "active" && (t as any).slug && (
                        <a href={`/college/${(t as any).slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                          <Globe className="h-3.5 w-3.5" /> View Page
                        </a>
                      )}
                      {!isArchived && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(t)}>
                            {t.status === "active" ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                            {t.status === "active" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggleRegistration(t)}>
                            {t.registration_open ? "Close Reg" : "Open Reg"}
                          </Button>
                          <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="text-muted-foreground hover:text-foreground p-1" aria-label={isExpanded ? "Collapse" : "Expand"}>
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </button>
                          <button onClick={() => setArchiveTarget(t)} className="text-muted-foreground hover:text-foreground p-1" aria-label="Archive" title="Archive">
                            <Archive className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {isArchived && (
                        <Button size="sm" variant="outline" onClick={() => restoreTournament(t)}>
                          <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Restore
                        </Button>
                      )}
                      <button onClick={() => setDeleteTarget(t)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete permanently" title="Delete permanently">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>


                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/20">
                    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
                      <TabsList className="mb-4 flex-wrap h-auto gap-1">
                        <TabsTrigger value="page-settings">
                          <Settings className="h-3.5 w-3.5 mr-1.5" /> Page Settings
                        </TabsTrigger>
                        <TabsTrigger value="invitations">
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Invitations ({invitations.length})
                        </TabsTrigger>
                        <TabsTrigger value="registrations">
                          <Users className="h-3.5 w-3.5 mr-1.5" /> Registrations ({registrations.length})
                        </TabsTrigger>
                        <TabsTrigger value="tabs">
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> Event Tabs ({tabs.length})
                        </TabsTrigger>
                        <TabsTrigger value="reg-fields">
                          <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Registration Fields
                        </TabsTrigger>
                      </TabsList>

                      {/* Page Settings Tab */}
                      <TabsContent value="page-settings" className="space-y-4">
                        {/* Tournament Details */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Pencil className="h-4 w-4 text-primary" /> Tournament Details
                            </h4>
                            {editingTournament === t.id ? (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveTournamentEdit}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingTournament(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => startEditTournament(t)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                            )}
                          </div>
                          {editingTournament === t.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Tournament Name</label>
                                <Input value={editTournamentForm.title} onChange={e => setEditTournamentForm({ ...editTournamentForm, title: e.target.value })} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Hero Tagline (short — shown on hero image)</label>
                                <Input
                                  value={editTournamentForm.hero_tagline}
                                  onChange={e => setEditTournamentForm({ ...editTournamentForm, hero_tagline: e.target.value })}
                                  placeholder="e.g. Fall Invitational · Oct 12–13"
                                  maxLength={140}
                                />
                                <p className="text-[11px] text-muted-foreground mt-1">Keep it short. This appears under the title on the hero banner. Leave blank to show nothing.</p>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Overview (full description, shown in the Overview tab)</label>
                                <RichTextEditor
                                  value={editTournamentForm.description}
                                  onChange={html => setEditTournamentForm({ ...editTournamentForm, description: html })}
                                  placeholder="Full event overview — supports headings, lists, links, colors, images..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                                  <Input type="date" value={editTournamentForm.start_date} onChange={e => setEditTournamentForm({ ...editTournamentForm, start_date: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                                  <Input type="date" value={editTournamentForm.end_date} onChange={e => setEditTournamentForm({ ...editTournamentForm, end_date: e.target.value })} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Golf Course</label>
                                  <Input value={editTournamentForm.course_name} onChange={e => setEditTournamentForm({ ...editTournamentForm, course_name: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Location (City, State)</label>
                                  <Input value={editTournamentForm.location} onChange={e => setEditTournamentForm({ ...editTournamentForm, location: e.target.value })} />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Contact Email</label>
                                <Input value={editTournamentForm.contact_email} onChange={e => setEditTournamentForm({ ...editTournamentForm, contact_email: e.target.value })} />
                              </div>
                            </div>
                          ) : (
                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                              <div><span className="text-muted-foreground">Name:</span> <strong>{t.title}</strong></div>
                              <div><span className="text-muted-foreground">Course:</span> {t.course_name || "—"}</div>
                              <div><span className="text-muted-foreground">Location:</span> {t.location || "—"}</div>
                              <div><span className="text-muted-foreground">Contact:</span> {t.contact_email || "—"}</div>
                              <div><span className="text-muted-foreground">Start:</span> {t.start_date || "—"}</div>
                              <div><span className="text-muted-foreground">End:</span> {t.end_date || "—"}</div>
                              {t.hero_tagline && <div className="sm:col-span-2"><span className="text-muted-foreground">Hero tagline:</span> {t.hero_tagline}</div>}
                              {t.description && <div className="sm:col-span-2"><span className="text-muted-foreground">Overview:</span> <div className="prose prose-sm max-w-none mt-1" dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.description) }} /></div>}
                            </div>
                          )}
                        </div>

                        {/* Page URL / Slug */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" /> Page URL
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">/college/</span>
                            {editingTournament === t.id ? (
                              <Input value={editTournamentForm.slug} onChange={e => setEditTournamentForm({ ...editTournamentForm, slug: e.target.value })} placeholder="tournament-slug" className="flex-1" />
                            ) : (
                              <div className="flex items-center gap-2 flex-1">
                                <code className="text-sm bg-muted px-2 py-1 rounded">{(t as any).slug || "auto-generated"}</code>
                                {t.status === "active" && (t as any).slug && (
                                  <a href={`/college/${(t as any).slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open →</a>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Edit the slug via "Edit" button above. The slug is auto-generated on creation but can be customized.</p>
                          {(t as any).slug && (
                            <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                              <p className="text-xs font-medium text-foreground">Text / Social Preview Link</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Share this in texts, Facebook, LinkedIn or Slack so the preview shows this
                                tournament's title and image instead of the TeeVents description.
                              </p>
                              <code className="mt-2 block text-xs break-all bg-muted px-2 py-1 rounded">{sharePreviewUrl(`/college/${(t as any).slug}`)}</code>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  navigator.clipboard.writeText(sharePreviewUrl(`/college/${(t as any).slug}`));
                                  toast({ title: "Preview link copied" });
                                }}
                              >
                                Copy Preview Link
                              </Button>
                            </div>
                          )}

                        </div>

                        {/* Hero Image */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Image className="h-4 w-4 text-primary" /> Hero Image
                          </h4>
                          {t.hero_image_url ? (
                            <div className="space-y-3">
                              <img src={t.hero_image_url} alt="Hero" className="w-full max-h-48 object-cover rounded-lg border border-border" />
                              <div className="flex gap-2 flex-wrap">
                                <label className="cursor-pointer">
                                  <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleHeroUpload(t.id, e.target.files[0]); }} />
                                  <Button variant="outline" size="sm" asChild><span><Upload className="h-3.5 w-3.5 mr-1" /> Replace</span></Button>
                                </label>
                                <a href={t.hero_image_url} download target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
                                </a>
                                <Button variant="outline" size="sm" onClick={() => removeHeroImage(t.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="bg-muted/30 rounded-lg p-4 text-center border border-dashed border-border">
                                <p className="text-sm text-muted-foreground mb-2">Using default hero image. Upload a custom one below.</p>
                                <a href="/src/assets/golf-course-hero.jpg" download target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                  Download current default image
                                </a>
                              </div>
                              <label className="cursor-pointer inline-flex">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleHeroUpload(t.id, e.target.files[0]); }} />
                                <Button variant="outline" size="sm" disabled={uploadingHero} asChild>
                                  <span>{uploadingHero ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />} Upload Hero Image</span>
                                </Button>
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Hero Overlay Opacity */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Sliders className="h-4 w-4 text-primary" /> Hero Overlay Transparency
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">Controls how dark the overlay is on the hero image. Higher = darker.</p>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[t.hero_overlay_opacity ?? 0.6]}
                              min={0}
                              max={1}
                              step={0.05}
                              onValueCommit={(val) => updateOverlayOpacity(t.id, val[0])}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-12 text-right">{Math.round((t.hero_overlay_opacity ?? 0.6) * 100)}%</span>
                          </div>
                        </div>

                        {/* Event Flyer for Public Page */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Image className="h-4 w-4 text-primary" /> Event Flyer (shown on public page)
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">This flyer will be displayed on the public tournament page below the navigation tabs and also included in invitation emails.</p>
                          {(() => {
                            const currentTournament = tournaments.find(ct => ct.id === expandedId);
                            return currentTournament?.flyer_url ? (
                              <div className="flex items-start gap-4">
                                <img src={currentTournament.flyer_url} alt="Event flyer" className="w-40 h-auto rounded-lg border border-border object-contain" />
                                <div className="space-y-2">
                                  <div className="flex gap-2 flex-wrap">
                                    <label className="cursor-pointer">
                                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFlyerUpload(e.target.files[0]); }} />
                                      <Button variant="outline" size="sm" asChild><span><Upload className="h-3.5 w-3.5 mr-1" /> Replace</span></Button>
                                    </label>
                                    <a href={currentTournament.flyer_url} download target="_blank" rel="noopener noreferrer">
                                      <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
                                    </a>
                                    <Button variant="outline" size="sm" onClick={removeFlyer} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer inline-flex">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFlyerUpload(e.target.files[0]); }} />
                                <Button variant="outline" size="sm" disabled={uploadingFlyer} asChild>
                                  <span>{uploadingFlyer ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />} Upload Flyer</span>
                                </Button>
                              </label>
                            );
                          })()}
                        </div>
                      </TabsContent>

                      {/* Invitations Tab */}
                      <TabsContent value="invitations" className="space-y-4">
                        {/* Event Flyer Upload */}
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Image className="h-4 w-4 text-primary" /> Event Flyer
                          </h4>
                          <p className="text-xs text-muted-foreground mb-3">Upload a flyer image to include in invitation emails sent to coaches.</p>
                          {(() => {
                            const currentTournament = tournaments.find(ct => ct.id === expandedId);
                            return currentTournament?.flyer_url ? (
                              <div className="flex items-start gap-4">
                                <img src={currentTournament.flyer_url} alt="Event flyer" className="w-40 h-auto rounded-lg border border-border object-contain" />
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">Flyer will be included in invitation emails.</p>
                                  <div className="flex gap-2">
                                    <label className="cursor-pointer">
                                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFlyerUpload(e.target.files[0]); }} />
                                      <Button variant="outline" size="sm" asChild><span><Upload className="h-3.5 w-3.5 mr-1" /> Replace</span></Button>
                                    </label>
                                    <Button variant="outline" size="sm" onClick={removeFlyer} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer inline-flex">
                                <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFlyerUpload(e.target.files[0]); }} />
                                <Button variant="outline" size="sm" disabled={uploadingFlyer} asChild>
                                  <span>{uploadingFlyer ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />} Upload Flyer</span>
                                </Button>
                              </label>
                            );
                          })()}
                        </div>
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
                                   <button onClick={() => setDeleteInvTarget(inv)} className="text-muted-foreground hover:text-destructive" title="Delete invitation">
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

                      <TabsContent value="registrations" className="space-y-4">
                        {registrations.length > 0 ? (
                          registrations.map(reg => (
                            <div key={reg.id} className="bg-card rounded-lg border border-border p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <School className="h-5 w-5 text-primary" />
                                  {editingRegId === reg.id ? (
                                    <div className="flex gap-2 flex-wrap items-center">
                                      <Input value={editRegForm.school_name} onChange={e => setEditRegForm({ ...editRegForm, school_name: e.target.value })} placeholder="School" className="h-8 text-sm w-40" />
                                      <Input value={editRegForm.coach_name} onChange={e => setEditRegForm({ ...editRegForm, coach_name: e.target.value })} placeholder="Coach" className="h-8 text-sm w-36" />
                                      <Input value={editRegForm.coach_email} onChange={e => setEditRegForm({ ...editRegForm, coach_email: e.target.value })} placeholder="Email" className="h-8 text-sm w-48" />
                                      <Input value={editRegForm.notes} onChange={e => setEditRegForm({ ...editRegForm, notes: e.target.value })} placeholder="Notes" className="h-8 text-sm w-40" />
                                      <Button size="sm" onClick={saveEditReg} className="h-7"><Save className="h-3.5 w-3.5" /></Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingRegId(null)} className="h-7"><X className="h-3.5 w-3.5" /></Button>
                                    </div>
                                  ) : (
                                    <div>
                                      <h4 className="font-semibold">{reg.school_name}</h4>
                                      <p className="text-xs text-muted-foreground">{reg.coach_name} · {reg.coach_email}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    reg.payment_status === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  }`}>
                                    {reg.payment_status}
                                  </span>
                                  {editingRegId !== reg.id && (
                                    <button onClick={() => startEditReg(reg)} className="text-muted-foreground hover:text-foreground" title="Edit registration">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button onClick={() => setDeleteRegTarget(reg)} className="text-muted-foreground hover:text-destructive" title="Delete team">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              {reg.players && reg.players.length > 0 ? (
                                <div className="border-t border-border pt-3">
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Roster ({reg.players.length} players)</h5>
                                  <div className="grid gap-1">
                                    {reg.players.map(p => (
                                      <div key={p.id} className="flex items-center gap-3 text-sm group">
                                        {editingPlayerId === p.id ? (
                                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                                            <Input value={editPlayerForm.first_name} onChange={e => setEditPlayerForm({ ...editPlayerForm, first_name: e.target.value })} placeholder="First" className="h-7 text-sm w-28" />
                                            <Input value={editPlayerForm.last_name} onChange={e => setEditPlayerForm({ ...editPlayerForm, last_name: e.target.value })} placeholder="Last" className="h-7 text-sm w-28" />
                                            <select value={editPlayerForm.year} onChange={e => setEditPlayerForm({ ...editPlayerForm, year: e.target.value })} className="h-7 rounded-md border border-input bg-background px-2 text-sm">
                                              <option value="">Year</option>
                                              <option value="freshman">FR</option>
                                              <option value="sophomore">SO</option>
                                              <option value="junior">JR</option>
                                              <option value="senior">SR</option>
                                              <option value="graduate">GR</option>
                                            </select>
                                            <select value={editPlayerForm.position} onChange={e => setEditPlayerForm({ ...editPlayerForm, position: e.target.value })} className="h-7 rounded-md border border-input bg-background px-2 text-sm">
                                              <option value="">Pos</option>
                                              <option value="1">1</option>
                                              <option value="2">2</option>
                                              <option value="3">3</option>
                                              <option value="4">4</option>
                                              <option value="5">5</option>
                                              <option value="alternate">Alt</option>
                                            </select>
                                            <Button size="sm" onClick={saveEditPlayer} className="h-6 px-2"><Save className="h-3 w-3" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditingPlayerId(null)} className="h-6 px-2"><X className="h-3 w-3" /></Button>
                                          </div>
                                        ) : (
                                          <>
                                            <span className="font-medium">{p.first_name} {p.last_name}</span>
                                            {p.year && <span className="text-xs text-muted-foreground capitalize">{p.year}</span>}
                                            {p.position && <span className="text-xs text-muted-foreground">Pos: {p.position === "alternate" ? "Alt" : p.position}</span>}
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity">
                                              <button onClick={() => startEditPlayer(p)} className="text-muted-foreground hover:text-foreground" title="Edit player">
                                                <Pencil className="h-3.5 w-3.5" />
                                              </button>
                                              <button onClick={() => setDeletePlayerTarget(p)} className="text-muted-foreground hover:text-destructive" title="Remove player">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No players listed yet.</p>
                              )}
                              {reg.notes && editingRegId !== reg.id && <p className="text-xs text-muted-foreground mt-2 italic">Note: {reg.notes}</p>}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic py-4 text-center">No registrations yet.</p>
                        )}
                      </TabsContent>

                      {/* Event Tabs Management */}
                      <TabsContent value="tabs" className="space-y-4">
                        {/* Built-in Overview tab management */}
                        {(() => {
                          const ct = currentTournament();
                          const visible = ct?.overview_visible ?? true;
                          return (
                            <div className="bg-card rounded-lg border border-primary/40 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm">Overview</h4>
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Built-in</span>
                                  {!visible && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Hidden</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={toggleOverviewVisibility} className="text-muted-foreground hover:text-foreground" title={visible ? "Hide tab" : "Show tab"}>
                                    {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">Shown as the first tab on your public page along with course, location, dates, and contact.</p>
                              {editingOverview ? (
                                <div className="space-y-2">
                                  <RichTextEditor
                                    value={editOverviewContent}
                                    onChange={(html) => setEditOverviewContent(html)}
                                    placeholder="Enter overview content..."
                                    onImageUpload={async (file) => {
                                      const ext = file.name.split(".").pop() || "png";
                                      const path = `college/${expandedId}/overview-${Date.now()}.${ext}`;
                                      const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
                                      if (upErr) {
                                        toast({ title: "Image upload failed", description: upErr.message, variant: "destructive" });
                                        throw upErr;
                                      }
                                      const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
                                      return publicUrl;
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveOverviewContent}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingOverview(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  {ct?.description ? (
                                    <div
                                      className="prose prose-sm max-w-none text-muted-foreground line-clamp-4"
                                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(ct.description) }}
                                    />
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">No overview content yet.</p>
                                  )}
                                  <Button size="sm" variant="outline" className="mt-2" onClick={() => { setEditingOverview(true); setEditOverviewContent(ct?.description || ""); }}>
                                    Edit Content
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <p className="text-xs text-muted-foreground">
                          Drag the <GripVertical className="h-3 w-3 inline" /> handle to reorder tabs. The Overview tab is always shown first on the public page.
                        </p>

                        <DragDropContext onDragEnd={reorderTabs}>
                          <Droppable droppableId="college-tabs">
                            {(droppableProvided) => (
                              <div
                                ref={droppableProvided.innerRef}
                                {...droppableProvided.droppableProps}
                                className="space-y-4"
                              >
                                {tabs.map((tab, index) => (
                                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                                    {(draggableProvided, snapshot) => (
                                      <div
                                        ref={draggableProvided.innerRef}
                                        {...draggableProvided.draggableProps}
                                        className={`bg-card rounded-lg border p-4 transition-shadow ${
                                          snapshot.isDragging
                                            ? "border-primary shadow-md"
                                            : "border-border"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <button
                                              type="button"
                                              {...draggableProvided.dragHandleProps}
                                              className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                                              aria-label={`Reorder ${tab.title}`}
                                            >
                                              <GripVertical className="h-4 w-4" />
                                            </button>
                                            <h4 className="font-semibold text-sm truncate">{tab.title}</h4>
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

                                        {tab.content_type === "bookings" ? (
                                          <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">
                                              Coaches can book trainer sessions from this tab. Manage available slots, categories, and reservations below.
                                            </p>
                                            <a
                                              href={`/admin/college-hub/bookings?context=${encodeURIComponent(tab.content || `college-hub:${expandedId}`)}&label=${encodeURIComponent(tab.title)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                            >
                                              <Settings className="h-3.5 w-3.5" /> Manage Booking Slots
                                            </a>
                                          </div>
                                        ) : tab.content_type === "file" ? (
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
                                                <RichTextEditor
                                                  value={editTabContent}
                                                  onChange={(html) => setEditTabContent(html)}
                                                  placeholder="Enter content..."
                                                  onImageUpload={async (file) => {
                                                    const ext = file.name.split(".").pop() || "png";
                                                    const path = `college/${expandedId}/tab-${tab.id}-${Date.now()}.${ext}`;
                                                    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
                                                    if (upErr) {
                                                      toast({ title: "Image upload failed", description: upErr.message, variant: "destructive" });
                                                      throw upErr;
                                                    }
                                                    const { data: { publicUrl } } = supabase.storage.from("tournament-assets").getPublicUrl(path);
                                                    return publicUrl;
                                                  }}
                                                />
                                                <div className="flex gap-2">
                                                  <Button size="sm" onClick={() => saveTabContent(tab.id)}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                                                  <Button size="sm" variant="outline" onClick={() => setEditingTab(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div>
                                                {tab.content ? (
                                                  <div
                                                    className="prose prose-sm max-w-none text-muted-foreground line-clamp-4"
                                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(tab.content) }}
                                                  />
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
                                    )}
                                  </Draggable>
                                ))}
                                {droppableProvided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>

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
                              <option value="bookings">Bookings (Team Therapy)</option>
                            </select>
                            <Button onClick={addTab}><Plus className="h-4 w-4 mr-1" /> Add Tab</Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Tip: Add a tab named <strong>Team Therapy</strong> with type <strong>Bookings</strong> so coaches can book sessions with your trainers.
                          </p>
                        </div>
                      </TabsContent>

                      {/* Registration Fields Tab */}
                      <TabsContent value="reg-fields" className="space-y-4">
                        <div className="bg-card rounded-lg border border-border p-4">
                          <h4 className="font-semibold text-sm mb-1">Registration Form Fields</h4>
                          <p className="text-xs text-muted-foreground mb-4">Customize the questions coaches see when registering their team. Core fields (School, Coach, Email) cannot be removed.</p>

                          <div className="space-y-2">
                            {regFields.map((field) => (
                              <div key={field.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-3 border border-border">
                                {editingFieldId === field.id ? (
                                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                                    <Input
                                      value={editFieldLabel}
                                      onChange={e => setEditFieldLabel(e.target.value)}
                                      className="flex-1 min-w-[150px] h-8 text-sm"
                                      placeholder="Field label"
                                    />
                                    <select
                                      value={editFieldType}
                                      onChange={e => setEditFieldType(e.target.value)}
                                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                    >
                                      <option value="text">Text</option>
                                      <option value="email">Email</option>
                                      <option value="number">Number</option>
                                      <option value="textarea">Textarea</option>
                                      <option value="select">Dropdown</option>
                                    </select>
                                    <label className="flex items-center gap-1.5 text-xs">
                                      <input type="checkbox" checked={editFieldRequired} onChange={e => setEditFieldRequired(e.target.checked)} />
                                      Required
                                    </label>
                                    <Button size="sm" variant="default" onClick={saveEditRegField} className="h-7 px-2">
                                      <Save className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingFieldId(null)} className="h-7 px-2">
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <span className="text-sm font-medium">{field.label}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-muted-foreground capitalize">{field.type}</span>
                                        {field.required && <span className="text-xs text-primary font-medium">Required</span>}
                                        {!field.editable && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Core</span>}
                                      </div>
                                    </div>
                                    {field.editable && (
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => startEditRegField(field)} className="text-muted-foreground hover:text-foreground" title="Edit field">
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => removeRegField(field.id)} className="text-muted-foreground hover:text-destructive" title="Remove field">
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Add New Field */}
                          <div className="mt-4 border-t border-border pt-4">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Add Custom Field</h5>
                            <div className="flex gap-2 flex-wrap items-end">
                              <Input
                                placeholder="Field Label"
                                value={newFieldLabel}
                                onChange={e => setNewFieldLabel(e.target.value)}
                                className="flex-1 min-w-[150px]"
                              />
                              <select
                                value={newFieldType}
                                onChange={e => setNewFieldType(e.target.value)}
                                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                              >
                                <option value="text">Text</option>
                                <option value="email">Email</option>
                                <option value="number">Number</option>
                                <option value="textarea">Textarea</option>
                                <option value="select">Dropdown</option>
                              </select>
                              <label className="flex items-center gap-1.5 text-sm h-10">
                                <input type="checkbox" checked={newFieldRequired} onChange={e => setNewFieldRequired(e.target.checked)} />
                                Required
                              </label>
                              <Button onClick={addRegField}><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
                            </div>
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
        );
      })()}
    </div>
  );
};

export default CollegeTournamentHub;
