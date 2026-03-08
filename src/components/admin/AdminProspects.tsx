import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isPast, isToday, addDays, differenceInDays } from "date-fns";
import {
  Plus, Search, Loader2, Trash2, Edit, ExternalLink,
  Phone, Mail, MapPin, CalendarIcon, Download, Filter,
  LayoutGrid, List, MessageSquare, PhoneCall, Video, FileText,
  ArrowRightLeft, Clock, Send, Copy, Check, ChevronDown,
  Bell, AlertTriangle, CheckCircle2, XCircle, Eye, Reply, MailOpen,
  FileEdit, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Prospect {
  id: string;
  organization_id: string | null;
  tournament_name: string;
  organizer_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  location: string;
  event_date: string;
  source: string;
  source_url: string;
  status: string;
  notes: string;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  last_email_template: string | null;
  last_email_sent_at: string | null;
  email_response_status: string | null;
  follow_up_count: number | null;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  prospect_id: string;
  type: string;
  description: string;
  created_at: string;
}

interface OutreachTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  sort_order: number;
}

const STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "demo_scheduled", label: "Demo Scheduled", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "negotiating", label: "Negotiating", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  { value: "won", label: "Won", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
];

const SOURCES = ["eventbrite", "google", "referral", "social_media", "cold_outreach", "website", "other"];

const ACTIVITY_TYPES = [
  { value: "note", label: "Note", icon: FileText },
  { value: "call", label: "Phone Call", icon: PhoneCall },
  { value: "email", label: "Email Sent", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Video },
  { value: "status_change", label: "Status Change", icon: ArrowRightLeft },
  { value: "follow_up", label: "Follow Up", icon: Bell },
];

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string }> = {
  no_website: { label: "No Website", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  outdated_website: { label: "Outdated Site", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  new_tournament: { label: "New Organizer", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  annual_tournament: { label: "Annual Event", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  custom: { label: "Custom", color: "bg-muted text-muted-foreground" },
};

const EMAIL_RESPONSE_STATUSES = [
  { value: "none", label: "Not Sent", icon: Mail, color: "text-muted-foreground" },
  { value: "sent", label: "Sent", icon: Send, color: "text-blue-500" },
  { value: "opened", label: "Opened", icon: MailOpen, color: "text-amber-500" },
  { value: "replied", label: "Replied", icon: Reply, color: "text-green-500" },
  { value: "no_response", label: "No Response", icon: XCircle, color: "text-red-400" },
];

const emptyProspect = {
  tournament_name: "",
  organizer_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  location: "",
  event_date: "",
  source: "eventbrite",
  source_url: "",
  status: "new",
  notes: "",
  next_follow_up: null as string | null,
};

interface AdminProspectsProps {
  prospects: Prospect[];
  activities: Activity[];
  outreachTemplates: OutreachTemplate[];
  onRefresh: () => void;
  callAdminApi: (action?: string, body?: Record<string, unknown>) => Promise<any>;
}

const AdminProspects = ({ prospects, activities, outreachTemplates, onRefresh, callAdminApi }: AdminProspectsProps) => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | null>(null);
  const [form, setForm] = useState(emptyProspect);
  const [saving, setSaving] = useState(false);
  const [newActivityType, setNewActivityType] = useState("note");
  const [newActivityDesc, setNewActivityDesc] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  // Email template state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailProspect, setEmailProspect] = useState<Prospect | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<OutreachTemplate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);
  const [markingSent, setMarkingSent] = useState(false);

  // Template management state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "custom", subject: "", body: "" });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Follow-up reminders
  const overdueProspects = useMemo(() =>
    prospects.filter(p => p.next_follow_up && isPast(new Date(p.next_follow_up)) && !isToday(new Date(p.next_follow_up)) && !["won", "lost"].includes(p.status)),
    [prospects]
  );
  const todayFollowUps = useMemo(() =>
    prospects.filter(p => p.next_follow_up && isToday(new Date(p.next_follow_up)) && !["won", "lost"].includes(p.status)),
    [prospects]
  );
  const upcomingFollowUps = useMemo(() =>
    prospects.filter(p => {
      if (!p.next_follow_up || ["won", "lost"].includes(p.status)) return false;
      const d = new Date(p.next_follow_up);
      return !isPast(d) && !isToday(d) && differenceInDays(d, new Date()) <= 7;
    }),
    [prospects]
  );

  const filtered = prospects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.tournament_name.toLowerCase().includes(q) ||
      (p.organizer_name || "").toLowerCase().includes(q) ||
      (p.contact_name || "").toLowerCase().includes(q) ||
      (p.contact_email || "").toLowerCase().includes(q) ||
      (p.location || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const fillTemplate = (template: OutreachTemplate, prospect: Prospect) => {
    const replacements: Record<string, string> = {
      "{{tournament_name}}": prospect.tournament_name || "your tournament",
      "{{contact_name}}": prospect.contact_name || "there",
      "{{organizer_name}}": prospect.organizer_name || "",
      "{{sender_name}}": "TeeVents Team",
      "{{sender_email}}": "hello@teevents.com",
    };
    let subject = template.subject;
    let body = template.body;
    for (const [key, val] of Object.entries(replacements)) {
      subject = subject.split(key).join(val);
      body = body.split(key).join(val);
    }
    return { subject, body };
  };

  const openEmailDialog = (prospect: Prospect) => {
    setEmailProspect(prospect);
    setSelectedTemplate(null);
    setEmailSubject("");
    setEmailBody("");
    setCopied(null);
    setEmailDialogOpen(true);
  };

  const selectTemplate = (template: OutreachTemplate) => {
    setSelectedTemplate(template);
    if (emailProspect) {
      const { subject, body } = fillTemplate(template, emailProspect);
      setEmailSubject(subject);
      setEmailBody(body);
    }
    setCopied(null);
  };

  const handleCopy = async (type: "subject" | "body" | "all") => {
    const text = type === "subject" ? emailSubject : type === "body" ? emailBody : `Subject: ${emailSubject}\n\n${emailBody}`;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMarkAsSent = async () => {
    if (!emailProspect || !selectedTemplate) return;
    setMarkingSent(true);
    try {
      await callAdminApi("log-email-sent", {
        prospect_id: emailProspect.id,
        template_slug: selectedTemplate.slug,
        template_name: selectedTemplate.name,
        new_status: emailProspect.status === "new" ? "contacted" : undefined,
      });
      toast({ title: "Email logged", description: `Outreach tracked for ${emailProspect.tournament_name}` });
      setEmailDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setMarkingSent(false);
    }
  };

  const handleUpdateResponseStatus = async (prospectId: string, status: string) => {
    try {
      await callAdminApi("update-prospect", { id: prospectId, email_response_status: status });
      onRefresh();
      toast({ title: "Response status updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleLogFollowUp = async (prospect: Prospect) => {
    try {
      await callAdminApi("add-prospect-activity", {
        prospect_id: prospect.id,
        type: "follow_up",
        description: `Follow-up completed (${prospect.follow_up_count ? prospect.follow_up_count + 1 : 1}x)`,
      });
      // Set next follow-up 7 days from now
      await callAdminApi("update-prospect", {
        id: prospect.id,
        follow_up_count: (prospect.follow_up_count || 0) + 1,
        next_follow_up: format(addDays(new Date(), 7), "yyyy-MM-dd"),
      });
      onRefresh();
      toast({ title: "Follow-up logged", description: "Next follow-up set for 7 days from now" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Template management
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: "", category: "custom", subject: "", body: "" });
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t: OutreachTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, category: t.category, subject: t.subject, body: t.body });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSavingTemplate(true);
    try {
      await callAdminApi("save-outreach-template", {
        id: editingTemplate?.id,
        name: templateForm.name.trim(),
        category: templateForm.category,
        subject: templateForm.subject.trim(),
        body: templateForm.body.trim(),
      });
      toast({ title: editingTemplate ? "Template updated" : "Template created" });
      setTemplateDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await callAdminApi("delete-outreach-template", { id });
      toast({ title: "Template deleted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProspect);
    setDialogOpen(true);
  };

  const openEdit = (p: Prospect) => {
    setEditing(p);
    setForm({
      tournament_name: p.tournament_name,
      organizer_name: p.organizer_name || "",
      contact_name: p.contact_name || "",
      contact_email: p.contact_email || "",
      contact_phone: p.contact_phone || "",
      location: p.location || "",
      event_date: p.event_date || "",
      source: p.source || "eventbrite",
      source_url: p.source_url || "",
      status: p.status,
      notes: p.notes || "",
      next_follow_up: p.next_follow_up,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.tournament_name.trim()) {
      toast({ title: "Tournament name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await callAdminApi("update-prospect", { id: editing.id, ...form });
        toast({ title: "Prospect updated" });
      } else {
        await callAdminApi("add-prospect", form);
        toast({ title: "Prospect added" });
      }
      setDialogOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await callAdminApi("delete-prospect", { id });
      toast({ title: "Prospect deleted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await callAdminApi("update-prospect", { id, status: newStatus });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddActivity = async () => {
    if (!editing || !newActivityDesc.trim()) return;
    setAddingActivity(true);
    try {
      await callAdminApi("add-prospect-activity", {
        prospect_id: editing.id,
        type: newActivityType,
        description: newActivityDesc.trim(),
      });
      setNewActivityDesc("");
      setNewActivityType("note");
      toast({ title: "Activity logged" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingActivity(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await callAdminApi("delete-prospect-activity", { id });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCSV = () => {
    const headers = ["Tournament", "Organizer", "Contact", "Email", "Phone", "Location", "Date", "Source", "Status", "Email Status", "Follow Ups", "Notes", "Follow Up"];
    const rows = prospects.map((p) => [
      p.tournament_name, p.organizer_name, p.contact_name, p.contact_email, p.contact_phone,
      p.location, p.event_date, p.source, p.status, p.email_response_status || "none", String(p.follow_up_count || 0), p.notes, p.next_follow_up || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find((st) => st.value === status);
    return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", s?.color || "bg-muted text-muted-foreground")}>{s?.label || status}</span>;
  };

  const getActivityIcon = (type: string) => {
    const t = ACTIVITY_TYPES.find((at) => at.value === type);
    const Icon = t?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getFollowUpIndicator = (prospect: Prospect) => {
    if (!prospect.next_follow_up || ["won", "lost"].includes(prospect.status)) return null;
    const d = new Date(prospect.next_follow_up);
    if (isPast(d) && !isToday(d)) {
      return <span className="flex items-center gap-1 text-[10px] font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Overdue</span>;
    }
    if (isToday(d)) {
      return <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"><Bell className="h-3 w-3" />Today</span>;
    }
    return <span className="text-xs text-muted-foreground">{format(d, "MMM d")}</span>;
  };

  const getResponseIcon = (status: string | null) => {
    const s = EMAIL_RESPONSE_STATUSES.find(r => r.value === (status || "none"));
    if (!s) return null;
    const Icon = s.icon;
    return <Icon className={cn("h-3.5 w-3.5", s.color)} />;
  };

  const prospectActivities = editing ? activities.filter(a => a.prospect_id === editing.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

  const stats = {
    total: prospects.length,
    new: prospects.filter((p) => p.status === "new").length,
    active: prospects.filter((p) => ["contacted", "demo_scheduled", "proposal_sent", "negotiating"].includes(p.status)).length,
    won: prospects.filter((p) => p.status === "won").length,
    lost: prospects.filter((p) => p.status === "lost").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Prospect Tracker</h2>
          <p className="text-sm text-muted-foreground">Manage outreach to golf tournament leads</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={openCreateTemplate}>
            <FileEdit className="h-4 w-4 mr-1.5" />Templates
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />Export CSV
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" />Add Prospect
          </Button>
        </div>
      </div>

      {/* Follow-Up Reminders Banner */}
      {(overdueProspects.length > 0 || todayFollowUps.length > 0) && (
        <div className="space-y-2">
          {overdueProspects.length > 0 && (
            <Card className="p-3 border-destructive/30 bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Overdue Follow-Ups ({overdueProspects.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {overdueProspects.slice(0, 5).map(p => (
                  <button key={p.id} onClick={() => openEdit(p)} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs hover:border-primary/50 transition-colors">
                    <span className="font-medium text-foreground">{p.tournament_name}</span>
                    <span className="text-destructive">{format(new Date(p.next_follow_up!), "MMM d")}</span>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); handleLogFollowUp(p); }}>
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />Done
                    </Button>
                  </button>
                ))}
                {overdueProspects.length > 5 && <span className="text-xs text-muted-foreground self-center">+{overdueProspects.length - 5} more</span>}
              </div>
            </Card>
          )}
          {todayFollowUps.length > 0 && (
            <Card className="p-3 border-amber-300/30 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Today's Follow-Ups ({todayFollowUps.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayFollowUps.map(p => (
                  <button key={p.id} onClick={() => openEdit(p)} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs hover:border-primary/50 transition-colors">
                    <span className="font-medium text-foreground">{p.tournament_name}</span>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); openEmailDialog(p); }}>
                      <Send className="h-3 w-3 mr-0.5" />Email
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={(e) => { e.stopPropagation(); handleLogFollowUp(p); }}>
                      <CheckCircle2 className="h-3 w-3 mr-0.5" />Done
                    </Button>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "New", value: stats.new, color: "text-blue-600" },
          { label: "Pipeline", value: stats.active, color: "text-purple-600" },
          { label: "Won", value: stats.won, color: "text-green-600" },
          { label: "Lost", value: stats.lost, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={cn("text-xl font-bold mt-0.5", s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9 w-[220px] bg-card" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] bg-card">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          <button onClick={() => setView("table")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            <List className="h-4 w-4 inline mr-1" />Table
          </button>
          <button onClick={() => setView("kanban")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            <LayoutGrid className="h-4 w-4 inline mr-1" />Pipeline
          </button>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Follow Up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {prospects.length === 0 ? "No prospects yet. Add your first lead!" : "No matches found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(p)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{p.tournament_name}</p>
                        {p.organizer_name && <p className="text-xs text-muted-foreground mt-0.5">{p.organizer_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span> : "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs border-0 bg-transparent p-0">
                          {getStatusBadge(p.status)}
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {getResponseIcon(p.email_response_status)}
                        {p.last_email_sent_at ? (
                          <div className="text-xs">
                            <p className="text-muted-foreground">{format(new Date(p.last_email_sent_at), "MMM d")}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {p.last_email_sent_at && (
                          <Select value={p.email_response_status || "sent"} onValueChange={(v) => handleUpdateResponseStatus(p.id, v)}>
                            <SelectTrigger className="w-[90px] h-6 text-[10px] border-0 bg-transparent p-0">
                              <span className="text-[10px]">{EMAIL_RESPONSE_STATUSES.find(r => r.value === (p.email_response_status || "sent"))?.label}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {EMAIL_RESPONSE_STATUSES.filter(s => s.value !== "none").map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {getFollowUpIndicator(p)}
                        {p.next_follow_up && isPast(new Date(p.next_follow_up)) && !["won", "lost"].includes(p.status) && (
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => handleLogFollowUp(p)}>
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Send Outreach Email" onClick={() => openEmailDialog(p)}>
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        {p.source_url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={p.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete prospect?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove "{p.tournament_name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(p.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.filter((s) => s.value !== "lost").map((status) => {
            const items = filtered.filter((p) => p.status === status.value);
            return (
              <div key={status.value} className="min-w-[240px] flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(p)}>
                        <p className="font-medium text-sm text-foreground">{p.tournament_name}</p>
                        {p.organizer_name && <p className="text-xs text-muted-foreground mt-0.5">{p.organizer_name}</p>}
                        {p.location && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            {getResponseIcon(p.email_response_status)}
                            {getFollowUpIndicator(p)}
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary" onClick={(e) => { e.stopPropagation(); openEmailDialog(p); }}>
                            <Send className="h-3 w-3 mr-1" />Email
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                  {items.length === 0 && <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">No prospects</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog with Activity Timeline */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Prospect" : "Add Prospect"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Form */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tournament Name *</Label>
                <Input value={form.tournament_name} onChange={(e) => setForm((f) => ({ ...f, tournament_name: e.target.value }))} placeholder="Annual Charity Golf Classic" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Organizer</Label><Input value={form.organizer_name} onChange={(e) => setForm((f) => ({ ...f, organizer_name: e.target.value }))} /></div>
                <div><Label className="text-xs">Contact</Label><Input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></div>
                <div><Label className="text-xs">Event Date</Label><Input value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Source URL</Label>
                <Input value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Next Follow-Up</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-sm", !form.next_follow_up && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.next_follow_up ? format(new Date(form.next_follow_up), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.next_follow_up ? new Date(form.next_follow_up) : undefined} onSelect={(d) => setForm((f) => ({ ...f, next_follow_up: d ? d.toISOString().split("T")[0] : null }))} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              {editing && (
                <Button variant="outline" className="w-full" onClick={() => { setDialogOpen(false); openEmailDialog(editing); }}>
                  <Send className="h-4 w-4 mr-2" />Send Outreach Email
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Update Prospect" : "Add Prospect"}
              </Button>
            </div>

            {/* Right: Activity Timeline */}
            {editing && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Activity Timeline
                </h3>
                {/* Add activity */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Select value={newActivityType} onValueChange={setNewActivityType}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.filter(t => t.value !== "status_change").map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddActivity} disabled={addingActivity || !newActivityDesc.trim()} className="h-8">
                      {addingActivity ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Input value={newActivityDesc} onChange={(e) => setNewActivityDesc(e.target.value)} placeholder="Log an activity..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleAddActivity()} />
                </div>
                {/* Timeline */}
                <div className="space-y-0 max-h-[400px] overflow-y-auto">
                  {prospectActivities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No activities yet</p>
                  ) : (
                    prospectActivities.map((a, i) => (
                      <div key={a.id} className="flex gap-3 group relative">
                        {i < prospectActivities.length - 1 && (
                          <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
                        )}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-1 relative z-10">
                          {getActivityIcon(a.type)}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-foreground capitalize">
                                {ACTIVITY_TYPES.find(t => t.value === a.type)?.label || a.type}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteActivity(a.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(a.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Outreach Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Outreach Email — {emailProspect?.tournament_name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 pt-2">
            {/* Left: Template picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose Template</Label>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={openCreateTemplate}>
                  <Plus className="h-3 w-3 mr-0.5" />New
                </Button>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {outreachTemplates.map((t) => {
                  const cat = TEMPLATE_CATEGORIES[t.category] || TEMPLATE_CATEGORIES.custom;
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{t.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", cat.color)}>
                          {cat.label}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); openEditTemplate(t); }} className="text-muted-foreground hover:text-foreground ml-auto">
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>

              {emailProspect?.contact_email && (
                <div className="bg-muted/50 rounded-lg p-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recipient</p>
                  <p className="text-sm font-medium text-foreground">{emailProspect.contact_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{emailProspect.contact_email}</p>
                </div>
              )}

              {emailProspect?.last_email_sent_at && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">Previous Outreach</p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Sent {format(new Date(emailProspect.last_email_sent_at), "MMM d, yyyy")}
                  </p>
                  {emailProspect.last_email_template && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Template: {outreachTemplates.find(t => t.slug === emailProspect.last_email_template)?.name || emailProspect.last_email_template}
                    </p>
                  )}
                  {emailProspect.email_response_status && emailProspect.email_response_status !== "none" && (
                    <div className="flex items-center gap-1 mt-1">
                      {getResponseIcon(emailProspect.email_response_status)}
                      <span className="text-xs">{EMAIL_RESPONSE_STATUSES.find(r => r.value === emailProspect.email_response_status)?.label}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Email preview / editor */}
            <div className="space-y-4">
              {!selectedTemplate ? (
                <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Select a template to get started</p>
                    <p className="text-xs mt-1">or <button onClick={openCreateTemplate} className="text-primary underline">create a custom one</button></p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Subject Line</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleCopy("subject")}>
                        {copied === "subject" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="font-medium" />
                  </div>

                  {/* Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Email Body</Label>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleCopy("body")}>
                        {copied === "body" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={14} className="text-sm leading-relaxed font-mono" />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Button onClick={() => handleCopy("all")} variant="outline" className="flex-1">
                      {copied === "all" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      Copy Full Email
                    </Button>
                    {emailProspect?.contact_email && (
                      <Button asChild variant="outline" className="flex-1">
                        <a href={`mailto:${emailProspect.contact_email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} target="_blank" rel="noopener noreferrer">
                          <Mail className="h-4 w-4 mr-2" />
                          Open in Mail App
                        </a>
                      </Button>
                    )}
                    <Button onClick={handleMarkAsSent} disabled={markingSent} className="flex-1">
                      {markingSent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Mark as Sent
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Copy the email and paste into your email client, or click "Open in Mail App". Then click "Mark as Sent" to log this outreach.
                  </p>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingTemplate ? "Edit Template" : "Create Outreach Template"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={editingTemplate ? "editor" : "library"}>
            <TabsList className="w-full">
              <TabsTrigger value="library" className="flex-1">Template Library ({outreachTemplates.length})</TabsTrigger>
              <TabsTrigger value="editor" className="flex-1">{editingTemplate ? "Edit Template" : "New Template"}</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-3 mt-4">
              {outreachTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No templates yet</p>
                </div>
              ) : (
                outreachTemplates.map((t) => {
                  const cat = TEMPLATE_CATEGORIES[t.category] || TEMPLATE_CATEGORIES.custom;
                  return (
                    <Card key={t.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground">{t.name}</h4>
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", cat.color)}>{cat.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Subject: {t.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body.slice(0, 120)}...</p>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTemplate(t)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete template?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove "{t.name}".</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTemplate(t.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
              <Button variant="outline" className="w-full" onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ name: "", category: "custom", subject: "", body: "" });
              }}>
                <Plus className="h-4 w-4 mr-2" />Create New Template
              </Button>
            </TabsContent>

            <TabsContent value="editor" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Template Name *</Label>
                  <Input value={templateForm.name} onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Follow-Up After Demo" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={templateForm.category} onValueChange={(v) => setTemplateForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_CATEGORIES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Subject Line *</Label>
                <Input value={templateForm.subject} onChange={(e) => setTemplateForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g., Upgrade {{tournament_name}} with TeeVents" />
                <p className="text-[10px] text-muted-foreground mt-1">Variables: {"{{contact_name}}"}, {"{{tournament_name}}"}, {"{{organizer_name}}"}, {"{{sender_name}}"}</p>
              </div>
              <div>
                <Label className="text-xs">Email Body *</Label>
                <Textarea value={templateForm.body} onChange={(e) => setTemplateForm(f => ({ ...f, body: e.target.value }))} rows={12} placeholder="Write your email template here. Use {{contact_name}} and {{tournament_name}} for personalization." className="font-mono text-sm" />
              </div>
              <Button onClick={handleSaveTemplate} disabled={savingTemplate} className="w-full">
                {savingTemplate && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProspects;
