import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Mail, Download, Loader2, ExternalLink,
  Check, X, MapPin, Copy, Send, ArrowUp, ArrowDown,
} from "lucide-react";

type Tournament = { id: string; title: string; slug: string | null };
type FormQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "dropdown" | "checkbox" | "yesno";
  options?: string[];
  required: boolean;
};
type VendorReg = {
  id: string;
  tournament_id: string;
  vendor_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  business_type: string | null;
  answers: Record<string, any> | null;
  booth_location: string | null;
  booth_fee_cents: number | null;
  payment_status: string;
  status: string;
  notes: string | null;
  checked_in: boolean;
  created_at: string;
};
type Booth = {
  id: string;
  tournament_id: string;
  location_name: string;
  description: string | null;
  is_available: boolean;
  assigned_to: string | null;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "Pending", cls: "bg-amber-100 text-amber-900 border-amber-300" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  denied: { label: "Denied", cls: "bg-rose-100 text-rose-900 border-rose-300" },
};

const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Unpaid", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  waived: { label: "Waived", cls: "bg-blue-100 text-blue-900 border-blue-300" },
};

const fmtUsd = (cents?: number | null) =>
  cents == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const newId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_QUESTIONS: FormQuestion[] = [
  { id: newId(), label: "Will you need electricity?", type: "yesno", required: false },
  { id: newId(), label: "Special requests", type: "textarea", required: false },
];

export default function Vendors() {
  const { org, loading: orgLoading } = useOrgContext();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form
  const [formId, setFormId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [formActive, setFormActive] = useState(true);
  const [boothFeeCents, setBoothFeeCents] = useState<number | "">("");

  // Vendors
  const [vendors, setVendors] = useState<VendorReg[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Booths
  const [booths, setBooths] = useState<Booth[]>([]);

  // Dialogs
  const [editingQ, setEditingQ] = useState<FormQuestion | null>(null);
  const [addingQ, setAddingQ] = useState(false);
  const [viewVendor, setViewVendor] = useState<VendorReg | null>(null);
  const [assignVendor, setAssignVendor] = useState<VendorReg | null>(null);
  const [denyVendor, setDenyVendor] = useState<VendorReg | null>(null);
  const [denyMessage, setDenyMessage] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [addBoothOpen, setAddBoothOpen] = useState(false);
  const [newBooth, setNewBooth] = useState({ location_name: "", description: "" });
  const [addManualOpen, setAddManualOpen] = useState(false);
  const [manualVendor, setManualVendor] = useState({
    vendor_name: "", contact_name: "", contact_email: "", contact_phone: "", business_type: "",
  });

  // Load tournaments
  useEffect(() => {
    const load = async () => {
      if (!org) return;
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, slug")
        .eq("organization_id", org.orgId)
        .order("created_at", { ascending: false });
      const list = (data || []) as Tournament[];
      setTournaments(list);
      if (list.length && !tournamentId) setTournamentId(list[0].id);
      setLoading(false);
    };
    if (org) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  // Load form, vendors, booths whenever tournament changes
  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      const [{ data: form }, { data: regs }, { data: b }, { data: t }] = await Promise.all([
        supabase.from("vendor_forms").select("*").eq("tournament_id", tournamentId).maybeSingle(),
        supabase.from("vendor_registrations").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: false }),
        supabase.from("vendor_booth_locations").select("*").eq("tournament_id", tournamentId).order("location_name"),
        supabase.from("tournaments").select("vendor_booth_fee_cents").eq("id", tournamentId).single(),
      ]);
      if (form) {
        setFormId((form as any).id);
        setQuestions(((form as any).questions as FormQuestion[]) || []);
        setFormActive(!!(form as any).is_active);
      } else {
        setFormId(null);
        setQuestions(DEFAULT_QUESTIONS);
        setFormActive(true);
      }
      setVendors((regs || []) as VendorReg[]);
      setBooths((b || []) as Booth[]);
      setBoothFeeCents(((t as any)?.vendor_booth_fee_cents ?? "") || "");
    };
    load();
  }, [tournamentId]);

  const tournament = tournaments.find((t) => t.id === tournamentId) || null;

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${v.vendor_name} ${v.contact_name} ${v.contact_email} ${v.business_type || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vendors, statusFilter, search]);

  const refreshVendors = async () => {
    const { data } = await supabase
      .from("vendor_registrations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });
    setVendors((data || []) as VendorReg[]);
  };

  const refreshBooths = async () => {
    const { data } = await supabase
      .from("vendor_booth_locations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("location_name");
    setBooths((data || []) as Booth[]);
  };

  // ===== Form Builder =====
  const saveForm = async () => {
    if (!tournamentId) return;
    const payload = { tournament_id: tournamentId, questions: questions as any, is_active: formActive };
    let error;
    if (formId) {
      ({ error } = await supabase.from("vendor_forms").update(payload).eq("id", formId));
    } else {
      const res = await supabase.from("vendor_forms").insert(payload).select("id").single();
      error = res.error;
      if (res.data) setFormId((res.data as any).id);
    }
    // Save booth fee on tournament
    await supabase
      .from("tournaments")
      .update({ vendor_booth_fee_cents: boothFeeCents === "" ? null : Number(boothFeeCents) })
      .eq("id", tournamentId);

    if (error) toast({ title: "Could not save form", description: error.message, variant: "destructive" });
    else toast({ title: "Form saved" });
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const next = [...questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setQuestions(next);
  };

  // ===== Vendor actions =====
  const handleApprove = async (v: VendorReg) => {
    if (!org) return;
    const { data, error } = await supabase.functions.invoke("approve-vendor", {
      body: {
        vendor_registration_id: v.id,
        decision: "approved",
        organization_id: org.orgId,
        booth_location: v.booth_location || undefined,
      },
    });
    if (error) {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
      return;
    }
    if ((data as any)?.payment_url) {
      toast({ title: "Vendor approved", description: "Payment link emailed to vendor." });
    } else {
      toast({ title: "Vendor approved" });
    }
    await refreshVendors();
  };

  const handleDeny = async () => {
    if (!denyVendor || !org) return;
    const { error } = await supabase.functions.invoke("approve-vendor", {
      body: {
        vendor_registration_id: denyVendor.id,
        decision: "denied",
        organization_id: org.orgId,
        message: denyMessage || undefined,
      },
    });
    if (error) {
      toast({ title: "Denial failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vendor notified of denial" });
    setDenyVendor(null);
    setDenyMessage("");
    await refreshVendors();
  };

  const handleAssignBooth = async (boothId: string | "none") => {
    if (!assignVendor) return;
    if (boothId === "none") {
      // Clear assignment
      if (assignVendor.booth_location) {
        await supabase
          .from("vendor_booth_locations")
          .update({ assigned_to: null, is_available: true })
          .eq("tournament_id", tournamentId)
          .eq("location_name", assignVendor.booth_location);
      }
      await supabase
        .from("vendor_registrations")
        .update({ booth_location: null })
        .eq("id", assignVendor.id);
    } else {
      const booth = booths.find((b) => b.id === boothId);
      if (!booth) return;
      // Free previous booth this vendor had, if any
      if (assignVendor.booth_location) {
        await supabase
          .from("vendor_booth_locations")
          .update({ assigned_to: null, is_available: true })
          .eq("tournament_id", tournamentId)
          .eq("location_name", assignVendor.booth_location);
      }
      await supabase
        .from("vendor_booth_locations")
        .update({ assigned_to: assignVendor.id, is_available: false })
        .eq("id", boothId);
      await supabase
        .from("vendor_registrations")
        .update({ booth_location: booth.location_name })
        .eq("id", assignVendor.id);
    }
    setAssignVendor(null);
    await Promise.all([refreshVendors(), refreshBooths()]);
    toast({ title: "Booth assignment updated" });
  };

  const handleCheckIn = async (v: VendorReg) => {
    await supabase
      .from("vendor_registrations")
      .update({ checked_in: !v.checked_in, checked_in_at: !v.checked_in ? new Date().toISOString() : null })
      .eq("id", v.id);
    await refreshVendors();
  };

  const handleAddManual = async () => {
    if (!tournamentId) return;
    if (!manualVendor.vendor_name || !manualVendor.contact_name || !manualVendor.contact_email) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("vendor_registrations").insert({
      tournament_id: tournamentId,
      vendor_name: manualVendor.vendor_name,
      contact_name: manualVendor.contact_name,
      contact_email: manualVendor.contact_email,
      contact_phone: manualVendor.contact_phone || null,
      business_type: manualVendor.business_type || null,
      booth_fee_cents: boothFeeCents === "" ? null : Number(boothFeeCents),
      status: "approved",
      payment_status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setAddManualOpen(false);
    setManualVendor({ vendor_name: "", contact_name: "", contact_email: "", contact_phone: "", business_type: "" });
    await refreshVendors();
    toast({ title: "Vendor added" });
  };

  // ===== Booths =====
  const addBooth = async () => {
    if (!tournamentId || !newBooth.location_name) return;
    const { error } = await supabase.from("vendor_booth_locations").insert({
      tournament_id: tournamentId,
      location_name: newBooth.location_name,
      description: newBooth.description || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setAddBoothOpen(false);
      setNewBooth({ location_name: "", description: "" });
      await refreshBooths();
    }
  };

  const deleteBooth = async (id: string) => {
    if (!confirm("Delete this booth location?")) return;
    await supabase.from("vendor_booth_locations").delete().eq("id", id);
    await refreshBooths();
  };

  // ===== CSV Export =====
  const exportCsv = () => {
    const headers = [
      "Vendor", "Contact", "Email", "Phone", "Type", "Status",
      "Payment", "Booth", "Fee", "Checked In", "Created",
      ...questions.map((q) => q.label),
    ];
    const rows = filteredVendors.map((v) => [
      v.vendor_name, v.contact_name, v.contact_email, v.contact_phone || "",
      v.business_type || "", STATUS_BADGE[v.status]?.label || v.status,
      PAY_BADGE[v.payment_status]?.label || v.payment_status,
      v.booth_location || "", v.booth_fee_cents != null ? (v.booth_fee_cents / 100).toFixed(2) : "",
      v.checked_in ? "Yes" : "No", new Date(v.created_at).toLocaleString(),
      ...questions.map((q) => {
        const a = v.answers?.[q.id];
        if (Array.isArray(a)) return a.join("; ");
        return a == null ? "" : String(a);
      }),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendors-${tournament?.slug || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Bulk Email =====
  const sendBulk = async () => {
    if (!org || selected.size === 0 || !bulkSubject || !bulkBody) {
      toast({ title: "Select recipients and fill subject/message", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("send-vendor-bulk-email", {
      body: {
        tournament_id: tournamentId,
        organization_id: org.orgId,
        recipient_ids: Array.from(selected),
        subject: bulkSubject,
        body_html: bulkBody.replace(/\n/g, "<br/>"),
      },
    });
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Sent to ${(data as any)?.sent ?? 0} vendor(s)` });
    setBulkOpen(false);
    setBulkSubject("");
    setBulkBody("");
    setSelected(new Set());
  };

  const publicUrl = tournament?.slug
    ? `${window.location.origin}/t/${tournament.slug}/vendors`
    : null;

  if (orgLoading || loading) {
    return <div className="p-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!tournaments.length) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Tournaments Yet</CardTitle>
            <CardDescription>Create a tournament to start managing vendors.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Recruit and manage vendors, booths, and check-in.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {publicUrl && (
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copied" }); }}>
              <Copy className="h-4 w-4 mr-1" /> Public link
            </Button>
          )}
          {publicUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Preview</a>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="vendors" className="w-full">
        <TabsList>
          <TabsTrigger value="vendors">All Vendors ({vendors.length})</TabsTrigger>
          <TabsTrigger value="form">Form Builder</TabsTrigger>
          <TabsTrigger value="booths">Booth Locations ({booths.length})</TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
        </TabsList>

        {/* ===== Vendors tab ===== */}
        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending_approval">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setAddManualOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Manually</Button>
                <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
                <Button size="sm" disabled={selected.size === 0} onClick={() => setBulkOpen(true)}>
                  <Mail className="h-4 w-4 mr-1" /> Email Selected ({selected.size})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredVendors.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">No vendors yet. Share the public link to start collecting applications.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={selected.size > 0 && selected.size === filteredVendors.length}
                          onCheckedChange={(c) => {
                            if (c) setSelected(new Set(filteredVendors.map((v) => v.id)));
                            else setSelected(new Set());
                          }}
                        />
                      </TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Booth</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((v) => {
                      const sb = STATUS_BADGE[v.status];
                      const pb = PAY_BADGE[v.payment_status];
                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(v.id)}
                              onCheckedChange={(c) => {
                                const next = new Set(selected);
                                if (c) next.add(v.id); else next.delete(v.id);
                                setSelected(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{v.vendor_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{v.contact_name}</div>
                            <div className="text-xs text-muted-foreground">{v.contact_email}</div>
                            {v.contact_phone && <div className="text-xs text-muted-foreground">{v.contact_phone}</div>}
                          </TableCell>
                          <TableCell className="capitalize">{v.business_type || "—"}</TableCell>
                          <TableCell>{v.booth_location || <span className="text-muted-foreground text-sm">Unassigned</span>}</TableCell>
                          <TableCell>{fmtUsd(v.booth_fee_cents)}</TableCell>
                          <TableCell><Badge variant="outline" className={sb?.cls}>{sb?.label}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={pb?.cls}>{pb?.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Button size="sm" variant="ghost" onClick={() => setViewVendor(v)} title="View answers">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setAssignVendor(v)} title="Assign booth">
                                <MapPin className="h-4 w-4" />
                              </Button>
                              {v.status === "pending_approval" && (
                                <>
                                  <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => handleApprove(v)}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setDenyVendor(v)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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

        {/* ===== Form Builder tab ===== */}
        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Registration Form</CardTitle>
              <CardDescription>
                Build the form vendors fill out at <code>/t/{tournament?.slug || ":slug"}/vendors</code>.
                Business name, contact name, email, phone, and business type are always collected.
                Add custom questions below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <div className="text-sm">
                  <div className="font-medium">Form is {formActive ? "active" : "paused"}</div>
                  <div className="text-muted-foreground">{formActive ? "Vendors can submit applications." : "Public form will not accept new applications."}</div>
                </div>
              </div>

              <div>
                <Label>Booth fee (USD, optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={boothFeeCents === "" ? "" : (boothFeeCents / 100).toString()}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBoothFeeCents(v === "" ? "" : Math.round(Number(v) * 100));
                    }}
                    placeholder="0.00"
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">Charged after approval. 5% platform fee applies.</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Custom questions</Label>
                  <Button size="sm" variant="outline" onClick={() => setAddingQ(true)}><Plus className="h-4 w-4 mr-1" /> Add Question</Button>
                </div>
                {questions.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded">No custom questions yet.</div>
                ) : (
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-2 p-3 border rounded-lg">
                        <div className="flex flex-col">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQuestion(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveQuestion(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{q.label} {q.required && <span className="text-rose-600">*</span>}</div>
                          <div className="text-xs text-muted-foreground capitalize">{q.type}{q.options?.length ? ` — ${q.options.join(", ")}` : ""}</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setEditingQ(q)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={saveForm}>Save Form</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Booth Locations tab ===== */}
        <TabsContent value="booths" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Booth Locations</CardTitle>
                <CardDescription>Pre-define booth spots and assign vendors from the All Vendors tab.</CardDescription>
              </div>
              <Button onClick={() => setAddBoothOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Location</Button>
            </CardHeader>
            <CardContent>
              {booths.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No booth locations yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booths.map((b) => {
                      const assigned = b.assigned_to ? vendors.find((v) => v.id === b.assigned_to) : null;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.location_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{b.description || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={b.is_available ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-300"}>
                              {b.is_available ? "Available" : "Taken"}
                            </Badge>
                          </TableCell>
                          <TableCell>{assigned ? assigned.vendor_name : "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteBooth(b.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* ===== Check-In tab ===== */}
        <TabsContent value="checkin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Check-In</CardTitle>
              <CardDescription>Mark vendors as checked in on event day.</CardDescription>
            </CardHeader>
            <CardContent>
              {vendors.filter((v) => v.status === "approved").length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No approved vendors yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Booth</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.filter((v) => v.status === "approved").map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.vendor_name}</TableCell>
                        <TableCell>{v.booth_location || <span className="text-muted-foreground text-sm">Unassigned</span>}</TableCell>
                        <TableCell className="text-sm">{v.contact_name} <span className="text-muted-foreground">· {v.contact_phone || v.contact_email}</span></TableCell>
                        <TableCell>
                          {v.checked_in
                            ? <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-300">Checked in</Badge>
                            : <Badge variant="outline">Not checked in</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant={v.checked_in ? "outline" : "default"} onClick={() => handleCheckIn(v)}>
                            {v.checked_in ? "Undo" : "Check In"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === Add/Edit question dialog === */}
      <QuestionDialog
        open={!!editingQ || addingQ}
        question={editingQ}
        onClose={() => { setEditingQ(null); setAddingQ(false); }}
        onSave={(q) => {
          if (editingQ) {
            setQuestions(questions.map((x) => (x.id === q.id ? q : x)));
          } else {
            setQuestions([...questions, { ...q, id: newId() }]);
          }
          setEditingQ(null); setAddingQ(false);
        }}
      />

      {/* === View vendor answers dialog === */}
      <Dialog open={!!viewVendor} onOpenChange={(o) => !o && setViewVendor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewVendor?.vendor_name}</DialogTitle>
            <DialogDescription>{viewVendor?.contact_name} — {viewVendor?.contact_email}</DialogDescription>
          </DialogHeader>
          {viewVendor && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Phone: </span>{viewVendor.contact_phone || "—"}</div>
                <div><span className="text-muted-foreground">Type: </span>{viewVendor.business_type || "—"}</div>
                <div><span className="text-muted-foreground">Booth: </span>{viewVendor.booth_location || "—"}</div>
                <div><span className="text-muted-foreground">Fee: </span>{fmtUsd(viewVendor.booth_fee_cents)}</div>
              </div>
              {questions.length > 0 && (
                <div>
                  <div className="font-medium text-sm mb-2">Custom answers</div>
                  <div className="space-y-2">
                    {questions.map((q) => {
                      const a = viewVendor.answers?.[q.id];
                      const display = Array.isArray(a) ? a.join(", ") : a == null || a === "" ? <span className="text-muted-foreground">—</span> : String(a);
                      return (
                        <div key={q.id} className="border-b pb-2">
                          <div className="text-xs text-muted-foreground">{q.label}</div>
                          <div className="text-sm">{display}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm">Internal notes</Label>
                <Textarea
                  className="mt-1"
                  value={viewVendor.notes || ""}
                  onChange={(e) => setViewVendor({ ...viewVendor, notes: e.target.value })}
                />
                <Button size="sm" className="mt-2" onClick={async () => {
                  await supabase.from("vendor_registrations").update({ notes: viewVendor.notes }).eq("id", viewVendor.id);
                  toast({ title: "Notes saved" });
                  await refreshVendors();
                }}>Save Notes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Assign booth dialog === */}
      <Dialog open={!!assignVendor} onOpenChange={(o) => !o && setAssignVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Booth</DialogTitle>
            <DialogDescription>{assignVendor?.vendor_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {booths.length === 0 && <div className="text-sm text-muted-foreground">No booths defined. Add some on the Booth Locations tab.</div>}
            <Button variant="outline" className="w-full justify-start" onClick={() => handleAssignBooth("none")}>
              Unassign
            </Button>
            {booths.map((b) => {
              const isCurrent = assignVendor?.booth_location === b.location_name;
              const taken = !b.is_available && !isCurrent;
              return (
                <Button
                  key={b.id}
                  variant={isCurrent ? "default" : "outline"}
                  className="w-full justify-between"
                  disabled={taken}
                  onClick={() => handleAssignBooth(b.id)}
                >
                  <span>{b.location_name}{b.description ? ` — ${b.description}` : ""}</span>
                  {taken && <span className="text-xs">Taken</span>}
                  {isCurrent && <span className="text-xs">Current</span>}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* === Deny dialog === */}
      <Dialog open={!!denyVendor} onOpenChange={(o) => !o && setDenyVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny vendor application</DialogTitle>
            <DialogDescription>The vendor will receive a polite email. You can include an optional message.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Optional message to vendor…" value={denyMessage} onChange={(e) => setDenyMessage(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyVendor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeny}>Deny &amp; Notify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Bulk email === */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {selected.size} vendor(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={8} value={bulkBody} onChange={(e) => setBulkBody(e.target.value)} placeholder="Setup instructions, schedule, parking details…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={sendBulk}><Send className="h-4 w-4 mr-1" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Add booth === */}
      <Dialog open={addBoothOpen} onOpenChange={setAddBoothOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Booth Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Location name *</Label>
              <Input value={newBooth.location_name} onChange={(e) => setNewBooth({ ...newBooth, location_name: e.target.value })} placeholder="e.g. Hole 5, Main Tent" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newBooth.description} onChange={(e) => setNewBooth({ ...newBooth, description: e.target.value })} placeholder="Optional details" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBoothOpen(false)}>Cancel</Button>
            <Button onClick={addBooth}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Add manual vendor === */}
      <Dialog open={addManualOpen} onOpenChange={setAddManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor Manually</DialogTitle>
            <DialogDescription>Adds an approved vendor record. Vendor will not receive an automated email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Business name *</Label><Input value={manualVendor.vendor_name} onChange={(e) => setManualVendor({ ...manualVendor, vendor_name: e.target.value })} /></div>
            <div><Label>Contact name *</Label><Input value={manualVendor.contact_name} onChange={(e) => setManualVendor({ ...manualVendor, contact_name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={manualVendor.contact_email} onChange={(e) => setManualVendor({ ...manualVendor, contact_email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={manualVendor.contact_phone} onChange={(e) => setManualVendor({ ...manualVendor, contact_phone: e.target.value })} /></div>
            <div><Label>Business type</Label><Input value={manualVendor.business_type} onChange={(e) => setManualVendor({ ...manualVendor, business_type: e.target.value })} placeholder="Food, Retail, Sponsor…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManualOpen(false)}>Cancel</Button>
            <Button onClick={handleAddManual}>Add Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Question Dialog ============
function QuestionDialog({
  open, question, onClose, onSave,
}: {
  open: boolean;
  question: FormQuestion | null;
  onClose: () => void;
  onSave: (q: FormQuestion) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormQuestion["type"]>("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(question?.label || "");
      setType(question?.type || "text");
      setOptions((question?.options || []).join(", "));
      setRequired(question?.required || false);
    }
  }, [open, question]);

  const needsOptions = type === "dropdown" || type === "checkbox";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Question label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Will you need electricity?" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FormQuestion["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short text</SelectItem>
                <SelectItem value="textarea">Long text</SelectItem>
                <SelectItem value="dropdown">Dropdown (single)</SelectItem>
                <SelectItem value="checkbox">Checkboxes (multi)</SelectItem>
                <SelectItem value="yesno">Yes / No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsOptions && (
            <div>
              <Label>Options (comma-separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Food, Retail, Sponsor, Other" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={required} onCheckedChange={(v) => setRequired(!!v)} />
            Required
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!label.trim()) { toast({ title: "Label required", variant: "destructive" }); return; }
            onSave({
              id: question?.id || newId(),
              label: label.trim(),
              type,
              options: needsOptions ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
              required,
            });
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
