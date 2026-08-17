import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import {
  Plus, Loader2, ExternalLink, Pencil, Trash2, Download, Users, FileText,
  Mail, Sparkles, BarChart3, Save,
} from "lucide-react";

interface Magnet {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  cover_image_url: string | null;
  article_type: string;
  is_published: boolean;
  download_count: number;
  view_count: number;
  created_at: string;
}

interface Lead {
  id: string;
  lead_magnet_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  organization_name: string | null;
  tournament_name: string | null;
  tournament_date: string | null;
  expected_players: number | null;
  challenge: string | null;
  notes: string | null;
  sample_created: boolean;
  downloaded_at: string;
}

interface Followup {
  id: string;
  lead_id: string;
  email_type: string;
  scheduled_for: string | null;
  sent_at: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const emptyForm = {
  id: "",
  title: "",
  slug: "",
  description: "",
  content: "",
  file_url: "",
  cover_image_url: "",
  article_type: "pdf",
  is_published: false,
  category_id: "",
};

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminLeadMagnets() {
  const navigate = useNavigate();
  const [magnets, setMagnets] = useState<Magnet[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articleCats, setArticleCats] = useState<{ article_id: string; category_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState<"file" | "cover" | null>(null);

  // Article filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Lead filters + detail
  const [leadMagnetFilter, setLeadMagnetFilter] = useState("all");
  const [leadDateFilter, setLeadDateFilter] = useState("");
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [leadNote, setLeadNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [m, l, f, c, ac] = await Promise.all([
      supabase.from("lead_magnets").select("*").order("created_at", { ascending: false }),
      supabase.from("lead_magnet_leads").select("*").order("downloaded_at", { ascending: false }).limit(1000),
      supabase.from("lead_magnet_followups").select("id, lead_id, email_type, scheduled_for, sent_at"),
      supabase.from("lead_magnet_categories").select("id, name, slug").order("name"),
      supabase.from("lead_magnet_article_categories").select("article_id, category_id"),
    ]);
    setMagnets((m.data as Magnet[]) ?? []);
    setLeads((l.data as Lead[]) ?? []);
    setFollowups((f.data as Followup[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setArticleCats((ac.data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const magnetTitle = (id: string | null) => magnets.find((m) => m.id === id)?.title ?? "—";

  const filteredMagnets = useMemo(
    () =>
      magnets.filter((m) => {
        if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter === "published" && !m.is_published) return false;
        if (statusFilter === "draft" && m.is_published) return false;
        if (categoryFilter !== "all" && !articleCats.some((a) => a.article_id === m.id && a.category_id === categoryFilter))
          return false;
        return true;
      }),
    [magnets, search, statusFilter, categoryFilter, articleCats]
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        if (leadMagnetFilter !== "all" && l.lead_magnet_id !== leadMagnetFilter) return false;
        if (leadDateFilter && !l.downloaded_at.startsWith(leadDateFilter)) return false;
        return true;
      }),
    [leads, leadMagnetFilter, leadDateFilter]
  );

  const openEditor = (m?: Magnet) => {
    if (m) {
      setForm({
        id: m.id,
        title: m.title,
        slug: m.slug,
        description: m.description ?? "",
        content: m.content ?? "",
        file_url: m.file_url ?? "",
        cover_image_url: m.cover_image_url ?? "",
        article_type: m.article_type,
        is_published: m.is_published,
        category_id: articleCats.find((a) => a.article_id === m.id)?.category_id ?? "",
      });
    } else {
      setForm({ ...emptyForm });
    }
    setEditorOpen(true);
  };

  const upload = async (file: File, kind: "file" | "cover") => {
    const maxMb = kind === "file" ? 10 : 2;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File must be under ${maxMb}MB`);
      return;
    }
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${kind === "file" ? "files" : "covers"}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("lead-magnets").upload(path, file, { upsert: false });
      if (error) throw error;
      if (kind === "file") {
        setForm((f) => ({ ...f, file_url: path }));
      } else {
        const { data } = await supabase.storage.from("lead-magnets").createSignedUrl(path, 60 * 60 * 24 * 365);
        setForm((f) => ({ ...f, cover_image_url: data?.signedUrl ?? path }));
      }
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.title);
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug,
        description: form.description.trim() || null,
        content: form.content || null,
        file_url: form.file_url || null,
        cover_image_url: form.cover_image_url || null,
        article_type: form.article_type,
        is_published: form.is_published,
      };
      let id = form.id;
      if (id) {
        const { error } = await supabase.from("lead_magnets").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("lead_magnets").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        id = (data as any)?.id;
      }
      if (id) {
        await supabase.from("lead_magnet_article_categories").delete().eq("article_id", id);
        if (form.category_id) {
          await supabase.from("lead_magnet_article_categories").insert({ article_id: id, category_id: form.category_id });
        }
      }
      toast.success("Article saved");
      setEditorOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (m: Magnet) => {
    const { error } = await supabase.from("lead_magnets").update({ is_published: !m.is_published }).eq("id", m.id);
    if (error) return toast.error(error.message);
    setMagnets((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_published: !x.is_published } : x)));
  };

  const remove = async (m: Magnet) => {
    if (!confirm(`Delete "${m.title}"? Captured leads are kept.`)) return;
    const { error } = await supabase.from("lead_magnets").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Phone", "Organization", "Magnet", "Tournament", "Tournament Date",
      "Expected Players", "Challenge", "Downloaded", "Sample Created",
    ];
    const rows = filteredLeads.map((l) => [
      l.full_name, l.email, l.phone ?? "", l.organization_name ?? "", magnetTitle(l.lead_magnet_id),
      l.tournament_name ?? "", l.tournament_date ?? "", l.expected_players ?? "",
      (l.challenge ?? "").replace(/\s+/g, " "), l.downloaded_at, l.sample_created ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-magnet-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendFollowups = async () => {
    try {
      const res = await fetch("/api/public/hooks/lead-magnet-followups", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed");
      toast.success(`Sent ${body.sent ?? 0} follow-up email(s)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Could not send follow-ups");
    }
  };

  const queueFollowup = async (lead: Lead) => {
    const { error } = await supabase.from("lead_magnet_followups").insert({
      lead_id: lead.id,
      email_type: "sample_offer",
      scheduled_for: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    await sendFollowups();
  };

  const saveNote = async () => {
    if (!openLead) return;
    const { error } = await supabase.from("lead_magnet_leads").update({ notes: leadNote }).eq("id", openLead.id);
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    setLeads((prev) => prev.map((l) => (l.id === openLead.id ? { ...l, notes: leadNote } : l)));
  };

  const convertToSample = async (lead: Lead) => {
    const { data, error } = await supabase
      .from("sample_requests")
      .insert({
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        organization_name: lead.organization_name,
        tournament_name: lead.tournament_name || `${lead.full_name}'s Tournament`,
        tournament_date: lead.tournament_date,
        expected_players: lead.expected_players,
        challenge: lead.challenge,
        notes: `Converted from lead magnet: ${magnetTitle(lead.lead_magnet_id)}`,
      })
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    await supabase
      .from("lead_magnet_leads")
      .update({ sample_created: true, sample_request_id: (data as any)?.id ?? null })
      .eq("id", lead.id);
    toast.success("Lead sent to the Demo Converter");
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, sample_created: true } : l)));
    setOpenLead(null);
    navigate(
      `/admin/demo-converter?name=${encodeURIComponent(lead.full_name)}&email=${encodeURIComponent(lead.email)}` +
        `&tournament=${encodeURIComponent(lead.tournament_name ?? "")}&date=${encodeURIComponent(lead.tournament_date ?? "")}` +
        `&players=${lead.expected_players ?? ""}`
    );
  };

  const leadFollowups = (leadId: string) => followups.filter((f) => f.lead_id === leadId);

  const totals = useMemo(() => {
    const downloads = magnets.reduce((s, m) => s + (m.download_count ?? 0), 0);
    const views = magnets.reduce((s, m) => s + (m.view_count ?? 0), 0);
    return {
      downloads,
      views,
      leads: leads.length,
      articles: magnets.length,
      conversion: views ? Math.round((leads.length / views) * 1000) / 10 : 0,
    };
  }, [magnets, leads]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles"><FileText className="mr-2 h-4 w-4" /> Articles</TabsTrigger>
          <TabsTrigger value="leads"><Users className="mr-2 h-4 w-4" /> Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="stats"><BarChart3 className="mr-2 h-4 w-4" /> Stats</TabsTrigger>
        </TabsList>

        {/* ARTICLES */}
        <TabsContent value="articles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Lead Magnet Articles</CardTitle>
              <Button onClick={() => openEditor()}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="w-64"
                  placeholder="Search titles…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Views</th>
                      <th className="py-2 pr-4">Downloads</th>
                      <th className="py-2 pr-4">Leads</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMagnets.map((m) => (
                      <tr key={m.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">{m.title}</td>
                        <td className="py-3 pr-4 uppercase text-xs">{m.article_type}</td>
                        <td className="py-3 pr-4">{m.view_count}</td>
                        <td className="py-3 pr-4">{m.download_count}</td>
                        <td className="py-3 pr-4">{leads.filter((l) => l.lead_magnet_id === m.id).length}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={m.is_published ? "default" : "secondary"}>
                            {m.is_published ? "Published" : "Draft"}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditor(m)}>
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/lead-magnet/${m.slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" /> View
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => togglePublish(m)}>
                              {m.is_published ? "Unpublish" : "Publish"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(m)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMagnets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">No articles match your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADS */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Leads</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={sendFollowups}>
                  <Mail className="mr-2 h-4 w-4" /> Send Due Follow-ups
                </Button>
                <Button variant="outline" onClick={exportCsv}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Select value={leadMagnetFilter} onValueChange={setLeadMagnetFilter}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Filter by magnet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Magnets</SelectItem>
                    {magnets.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" className="w-48" value={leadDateFilter} onChange={(e) => setLeadDateFilter(e.target.value)} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Magnet</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => (
                      <tr key={l.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">
                          {l.full_name}
                          {l.sample_created && <Badge className="ml-2" variant="secondary">Sample Created</Badge>}
                        </td>
                        <td className="py-3 pr-4">{l.email}</td>
                        <td className="py-3 pr-4">{magnetTitle(l.lead_magnet_id)}</td>
                        <td className="py-3 pr-4">{fmtDate(l.downloaded_at)}</td>
                        <td className="py-3">
                          <Button size="sm" variant="outline" onClick={() => { setOpenLead(l); setLeadNote(l.notes ?? ""); }}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">No leads yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total Downloads", totals.downloads],
              ["Total Leads", totals.leads],
              ["Total Articles", totals.articles],
              ["Conversion Rate", `${totals.conversion}%`],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <CardContent className="py-5">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Downloads by Article</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Article</th>
                    <th className="py-2 pr-4">Views</th>
                    <th className="py-2 pr-4">Downloads</th>
                    <th className="py-2 pr-4">Leads</th>
                    <th className="py-2">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {magnets.map((m) => {
                    const count = leads.filter((l) => l.lead_magnet_id === m.id).length;
                    const rate = m.view_count ? Math.round((count / m.view_count) * 1000) / 10 : 0;
                    return (
                      <tr key={m.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">{m.title}</td>
                        <td className="py-3 pr-4">{m.view_count}</td>
                        <td className="py-3 pr-4">{m.download_count}</td>
                        <td className="py-3 pr-4">{count}</td>
                        <td className="py-3">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ARTICLE EDITOR */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit" : "Add"} Lead Magnet Article</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) }))
                }
                maxLength={160}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} maxLength={80} />
              <p className="mt-1 text-xs text-muted-foreground">Public page: /lead-magnet/{form.slug || "your-slug"}</p>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={800}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Article Type</Label>
                <Select value={form.article_type} onValueChange={(v) => setForm((f) => ({ ...f, article_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Content (for HTML / checklist articles)</Label>
              <RichTextEditor value={form.content} onChange={(html) => setForm((f) => ({ ...f, content: html }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Upload File (PDF, max 10MB)</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  disabled={uploading === "file"}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "file")}
                />
                {form.file_url && <p className="mt-1 truncate text-xs text-muted-foreground">Attached: {form.file_url}</p>}
              </div>
              <div>
                <Label>Cover Image (JPG/PNG, max 2MB)</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading === "cover"}
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")}
                />
                {form.cover_image_url && <p className="mt-1 truncate text-xs text-muted-foreground">Cover set</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} />
              <Label>Published</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Article
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LEAD DETAIL */}
      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead – {openLead?.full_name}</DialogTitle>
          </DialogHeader>
          {openLead && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Email:</span> {openLead.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {openLead.phone || "—"}</div>
                <div><span className="text-muted-foreground">Organization:</span> {openLead.organization_name || "—"}</div>
                <div><span className="text-muted-foreground">Tournament:</span> {openLead.tournament_name || "—"}</div>
                <div><span className="text-muted-foreground">Date:</span> {fmtDate(openLead.tournament_date)}</div>
                <div><span className="text-muted-foreground">Players:</span> {openLead.expected_players ?? "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Challenge:</span> {openLead.challenge || "—"}
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="font-medium">
                  Downloaded: {magnetTitle(openLead.lead_magnet_id)} – {fmtDate(openLead.downloaded_at)}
                </div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {leadFollowups(openLead.id).map((f) => (
                    <li key={f.id}>
                      {f.email_type === "confirmation" ? "Follow-up Email 1 (confirmation)" : "Follow-up Email 2 (sample offer)"}:{" "}
                      {f.sent_at ? `Sent ${fmtDate(f.sent_at)}` : `Pending${f.scheduled_for ? ` – scheduled ${fmtDate(f.scheduled_for)}` : ""}`}
                    </li>
                  ))}
                  {leadFollowups(openLead.id).length === 0 && <li>No follow-ups recorded.</li>}
                </ul>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={3} value={leadNote} onChange={(e) => setLeadNote(e.target.value)} maxLength={2000} />
                <Button size="sm" variant="outline" className="mt-2" onClick={saveNote}>Add Note</Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => queueFollowup(openLead)}>
                  <Mail className="mr-2 h-4 w-4" /> Send Follow-up
                </Button>
                <Button onClick={() => convertToSample(openLead)} disabled={openLead.sample_created}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {openLead.sample_created ? "Sample Created" : "Convert to Sample"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
