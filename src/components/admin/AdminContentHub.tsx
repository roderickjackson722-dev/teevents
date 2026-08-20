// Content Hub — unified home for the content & email marketing system.
// Tabs: Library (SEO articles / lead magnets / guides), Social Calendar,
// Newsletters, Subscribers.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLeadMagnets from "@/components/admin/AdminLeadMagnets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BookOpen, CalendarDays, Mail, Users, Plus, Send, Trash2, Pencil, Download,
} from "lucide-react";

type SocialPost = {
  id: string;
  platform: string;
  caption: string;
  post_date: string;
  status: string;
  link_url: string | null;
  impressions: number | null;
  engagements: number | null;
};

type Newsletter = {
  id: string;
  title: string;
  subject: string;
  body: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number | null;
};

type Subscriber = {
  id: string;
  email: string;
  full_name: string | null;
  source: string | null;
  status: string;
  created_at: string;
};

const PLATFORMS = ["instagram", "facebook", "linkedin", "tiktok", "x"];

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  posted: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  unsubscribed: "bg-red-100 text-red-800",
};

function StatusBadge({ value }: { value: string }) {
  return <Badge className={statusTone[value] || "bg-muted text-muted-foreground"}>{value}</Badge>;
}

export default function AdminContentHub() {
  const { toast } = useToast();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const [postDialog, setPostDialog] = useState<Partial<SocialPost> | null>(null);
  const [nlDialog, setNlDialog] = useState<Partial<Newsletter> | null>(null);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [subFilter, setSubFilter] = useState<"all" | "active" | "unsubscribed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, n, s] = await Promise.all([
      supabase.from("social_posts").select("*").order("post_date", { ascending: true }),
      supabase.from("newsletters").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
    ]);
    setPosts((p.data as SocialPost[]) || []);
    setNewsletters((n.data as Newsletter[]) || []);
    setSubscribers((s.data as Subscriber[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeSubs = useMemo(() => subscribers.filter((s) => s.status === "active").length, [subscribers]);
  const shownSubs = useMemo(
    () => (subFilter === "all" ? subscribers : subscribers.filter((s) => s.status === subFilter)),
    [subscribers, subFilter],
  );

  /* ── Social posts ── */
  const savePost = async () => {
    if (!postDialog) return;
    const payload = {
      platform: postDialog.platform || "instagram",
      caption: postDialog.caption || "",
      post_date: postDialog.post_date || new Date().toISOString().slice(0, 10),
      status: postDialog.status || "draft",
      link_url: postDialog.link_url || null,
    };
    const res = postDialog.id
      ? await supabase.from("social_posts").update(payload as never).eq("id", postDialog.id)
      : await supabase.from("social_posts").insert(payload as never);
    if (res.error) return toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    setPostDialog(null);
    toast({ title: "Post saved" });
    load();
  };

  const deletePost = async (id: string) => {
    await supabase.from("social_posts").delete().eq("id", id);
    load();
  };

  /* ── Newsletters ── */
  const saveNewsletter = async () => {
    if (!nlDialog) return;
    if (!nlDialog.subject?.trim()) {
      return toast({ title: "Subject required", variant: "destructive" });
    }
    const payload = {
      title: nlDialog.title || nlDialog.subject,
      subject: nlDialog.subject,
      body: nlDialog.body || "",
      status: nlDialog.status || "draft",
      scheduled_for: nlDialog.scheduled_for || null,
    };
    const res = nlDialog.id
      ? await supabase.from("newsletters").update(payload as never).eq("id", nlDialog.id)
      : await supabase.from("newsletters").insert(payload as never);
    if (res.error) return toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
    setNlDialog(null);
    toast({ title: "Newsletter saved" });
    load();
  };

  const deleteNewsletter = async (id: string) => {
    await supabase.from("newsletters").delete().eq("id", id);
    load();
  };

  const sendNewsletter = async (id: string, mode: "test" | "send") => {
    if (mode === "send" && !window.confirm(`Send to all ${activeSubs} active subscribers?`)) return;
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/public/newsletter-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ newsletter_id: id, mode, test_email: testEmail || undefined }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error || `HTTP ${res.status}`);
      toast({
        title: mode === "test" ? "Test sent" : "Newsletter sent",
        description: `${out.sent} sent${out.failed ? `, ${out.failed} failed` : ""}.`,
      });
      load();
    } catch (e) {
      toast({ title: "Send failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const exportSubscribers = () => {
    const rows = [["Email", "Name", "Source", "Status", "Joined"]].concat(
      shownSubs.map((s) => [
        s.email,
        s.full_name || "",
        s.source || "",
        s.status,
        new Date(s.created_at).toLocaleDateString(),
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Content Hub</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Articles, lead magnets, the social calendar and the TeeVents newsletter, all in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Social posts", value: posts.length, icon: CalendarDays },
          { label: "Scheduled posts", value: posts.filter((p) => p.status === "scheduled").length, icon: CalendarDays },
          { label: "Newsletters", value: newsletters.length, icon: Mail },
          { label: "Active subscribers", value: activeSubs, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 text-center">
              <s.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library"><BookOpen className="h-4 w-4 mr-1.5" />Library</TabsTrigger>
          <TabsTrigger value="social"><CalendarDays className="h-4 w-4 mr-1.5" />Social Calendar</TabsTrigger>
          <TabsTrigger value="newsletters"><Mail className="h-4 w-4 mr-1.5" />Newsletters</TabsTrigger>
          <TabsTrigger value="subscribers"><Users className="h-4 w-4 mr-1.5" />Subscribers</TabsTrigger>
        </TabsList>

        {/* ── Library (existing lead magnet / article manager) ── */}
        <TabsContent value="library">
          <AdminLeadMagnets />
        </TabsContent>

        {/* ── Social Calendar ── */}
        <TabsContent value="social">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Social Calendar</CardTitle>
              <Button size="sm" onClick={() => setPostDialog({ platform: "instagram", status: "draft" })}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Post
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No posts scheduled yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {p.post_date ? new Date(`${p.post_date}T00:00:00`).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="capitalize text-sm">{p.platform}</TableCell>
                        <TableCell className="max-w-[320px] truncate text-sm">{p.caption}</TableCell>
                        <TableCell><StatusBadge value={p.status} /></TableCell>
                        <TableCell className="text-right text-sm">
                          {(p.impressions ?? 0).toLocaleString()} / {(p.engagements ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setPostDialog(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deletePost(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

        {/* ── Newsletters ── */}
        <TabsContent value="newsletters">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Newsletters</CardTitle>
              <Button size="sm" onClick={() => setNlDialog({ status: "draft" })}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Newsletter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px]">
                  <Label className="text-xs">Test email address</Label>
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="you@example.com (defaults to your login)"
                  />
                </div>
                <p className="text-xs text-muted-foreground pb-2">
                  {activeSubs} active subscriber{activeSubs === 1 ? "" : "s"} will receive a full send.
                </p>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : newsletters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No newsletters yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsletters.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="text-sm">
                          <p className="font-medium text-foreground">{n.subject}</p>
                          <p className="text-xs text-muted-foreground">{n.title}</p>
                        </TableCell>
                        <TableCell><StatusBadge value={n.status} /></TableCell>
                        <TableCell className="text-sm">
                          {n.sent_at ? new Date(n.sent_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">{n.recipient_count ?? 0}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" disabled={sending} onClick={() => sendNewsletter(n.id, "test")}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Test
                          </Button>
                          <Button size="sm" variant="outline" disabled={sending} onClick={() => sendNewsletter(n.id, "send")}>
                            Send all
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setNlDialog(n)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteNewsletter(n.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

        {/* ── Subscribers ── */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-base">Subscribers</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={subFilter} onValueChange={(v) => setSubFilter(v as typeof subFilter)}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportSubscribers}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : shownSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscribers yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownSubs.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{s.email}</TableCell>
                        <TableCell className="text-sm">{s.full_name || "—"}</TableCell>
                        <TableCell className="text-sm">{s.source || "—"}</TableCell>
                        <TableCell><StatusBadge value={s.status} /></TableCell>
                        <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Social post dialog */}
      <Dialog open={!!postDialog} onOpenChange={(o) => !o && setPostDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{postDialog?.id ? "Edit post" : "New social post"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Platform</Label>
              <Select
                value={postDialog?.platform || "instagram"}
                onValueChange={(v) => setPostDialog((d) => ({ ...d, platform: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Caption</Label>
              <Textarea
                rows={5}
                value={postDialog?.caption || ""}
                onChange={(e) => setPostDialog((d) => ({ ...d, caption: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Post date</Label>
                <Input
                  type="date"
                  value={postDialog?.post_date ? String(postDialog.post_date).slice(0, 10) : ""}
                  onChange={(e) => setPostDialog((d) => ({ ...d, post_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={postDialog?.status || "draft"}
                  onValueChange={(v) => setPostDialog((d) => ({ ...d, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Link (optional)</Label>
              <Input
                value={postDialog?.link_url || ""}
                onChange={(e) => setPostDialog((d) => ({ ...d, link_url: e.target.value }))}
                placeholder="https://www.teevents.golf/lead-magnet/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostDialog(null)}>Cancel</Button>
            <Button onClick={savePost}>Save Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Newsletter dialog */}
      <Dialog open={!!nlDialog} onOpenChange={(o) => !o && setNlDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{nlDialog?.id ? "Edit newsletter" : "New newsletter"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Internal title</Label>
              <Input
                value={nlDialog?.title || ""}
                onChange={(e) => setNlDialog((d) => ({ ...d, title: e.target.value }))}
                placeholder="March 2026 — Spring season kickoff"
              />
            </div>
            <div>
              <Label>Subject line</Label>
              <Input
                value={nlDialog?.subject || ""}
                onChange={(e) => setNlDialog((d) => ({ ...d, subject: e.target.value }))}
                placeholder="5 ways to fill your spring tournament field"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                rows={12}
                value={nlDialog?.body || ""}
                onChange={(e) => setNlDialog((d) => ({ ...d, body: e.target.value }))}
                placeholder={"Hi [Name],\n\nPlain paragraphs or HTML both work. Use [Name] to personalize."}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code>[Name]</code> for the subscriber's first name. The TeeVents header, footer and
                unsubscribe link are added automatically.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule (optional)</Label>
                <Input
                  type="datetime-local"
                  value={nlDialog?.scheduled_for ? String(nlDialog.scheduled_for).slice(0, 16) : ""}
                  onChange={(e) =>
                    setNlDialog((d) => ({ ...d, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null }))
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={nlDialog?.status || "draft"}
                  onValueChange={(v) => setNlDialog((d) => ({ ...d, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNlDialog(null)}>Cancel</Button>
            <Button onClick={saveNewsletter}>Save Newsletter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
