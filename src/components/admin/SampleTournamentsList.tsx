import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  Pencil,
  Save,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";

export interface SampleRow {
  id: string;
  tournament_name: string;
  unique_slug: string;
  event_date: string | null;
  location: string | null;
  registration_fee_cents: number | null;
  logo_url: string | null;
  hero_image_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  prospect_company: string | null;
  sample_share_link: string | null;
  view_count: number;
  tour_completed: boolean;
  conversion_status: string;
  converted_at: string | null;
  converted_tournament_id: string | null;
  conversion_notes: string | null;
  created_at: string;
}

const STATUSES: { value: string; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "sent", label: "Sample sent" },
  { value: "viewed", label: "Viewed by customer" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Not moving forward" },
];

function statusBadge(s: string): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  switch (s) {
    case "converted":
      return { label: "✅ Converted", variant: "default" };
    case "interested":
      return { label: "🔥 Interested", variant: "secondary" };
    case "viewed":
      return { label: "👀 Viewed", variant: "secondary" };
    case "sent":
      return { label: "📤 Sent", variant: "outline" };
    case "lost":
      return { label: "Not moving forward", variant: "destructive" };
    default:
      return { label: "Created", variant: "outline" };
  }
}

const SELECT_COLS =
  "id, tournament_name, unique_slug, event_date, location, registration_fee_cents, logo_url, hero_image_url, primary_color, secondary_color, prospect_name, prospect_email, prospect_phone, prospect_company, sample_share_link, view_count, tour_completed, conversion_status, converted_at, converted_tournament_id, conversion_notes, created_at";

export default function SampleTournamentsList({ reloadKey }: { reloadKey?: number }) {
  const [rows, setRows] = useState<SampleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyUpload, setBusyUpload] = useState(false);

  const [editTarget, setEditTarget] = useState<SampleRow | null>(null);
  const [editForm, setEditForm] = useState({
    tournament_name: "",
    event_date: "",
    location: "",
    registration_fee_dollars: "",
    primary_color: "#1a5c38",
    secondary_color: "#F5A623",
    logo_url: "",
    hero_image_url: "",
    prospect_name: "",
    prospect_email: "",
    prospect_phone: "",
  });
  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  const [convTarget, setConvTarget] = useState<SampleRow | null>(null);
  const [convForm, setConvForm] = useState({
    conversion_status: "converted",
    converted_tournament_id: "",
    conversion_notes: "",
  });
  const [liveTournaments, setLiveTournaments] = useState<{ id: string; title: string }[]>([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sample_tournaments")
      .select(SELECT_COLS)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Could not load samples", description: error.message, variant: "destructive" });
    setRows(((data as unknown) as SampleRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [reloadKey]);

  function linkFor(r: SampleRow) {
    return r.sample_share_link || `${window.location.origin}/sample/${r.unique_slug}`;
  }

  async function setStatus(r: SampleRow, status: string) {
    const patch: Record<string, unknown> = { conversion_status: status };
    if (status === "converted" && !r.converted_at) patch.converted_at = new Date().toISOString();
    if (status !== "converted") patch.converted_at = null;
    const { error } = await supabase.from("sample_tournaments").update(patch as never).eq("id", r.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  }

  async function markShared(r: SampleRow) {
    await supabase
      .from("sample_tournaments")
      .update({ shared_at: new Date().toISOString(), conversion_status: r.conversion_status === "created" ? "sent" : r.conversion_status } as never)
      .eq("id", r.id);
    await load();
  }

  function openEdit(r: SampleRow) {
    setEditTarget(r);
    setEditForm({
      tournament_name: r.tournament_name || "",
      event_date: r.event_date || "",
      location: r.location || "",
      registration_fee_dollars: r.registration_fee_cents != null ? (r.registration_fee_cents / 100).toFixed(0) : "",
      primary_color: r.primary_color || "#1a5c38",
      secondary_color: r.secondary_color || "#F5A623",
      logo_url: r.logo_url || "",
      hero_image_url: r.hero_image_url || "",
      prospect_name: r.prospect_name || "",
      prospect_email: r.prospect_email || "",
      prospect_phone: r.prospect_phone || "",
    });
  }

  async function upload(file: File, kind: "logo" | "hero") {
    if (kind === "logo" && file.size > 2 * 1024 * 1024) {
      toast({ title: "Logo too large", description: "Please use a PNG or JPG under 2MB.", variant: "destructive" });
      return;
    }
    setBusyUpload(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `samples/${Date.now()}-${kind}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    setBusyUpload(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setEditForm((f) => (kind === "logo" ? { ...f, logo_url: data.publicUrl } : { ...f, hero_image_url: data.publicUrl }));
    toast({ title: kind === "logo" ? "Logo uploaded" : "Hero image uploaded" });
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (!editForm.tournament_name.trim()) {
      toast({ title: "Event name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const feeStr = editForm.registration_fee_dollars.trim();
    const feeCents = feeStr ? Math.max(0, Math.round(Number(feeStr) * 100)) : null;
    const { error } = await supabase
      .from("sample_tournaments")
      .update({
        tournament_name: editForm.tournament_name.trim(),
        event_date: editForm.event_date || null,
        location: editForm.location || null,
        registration_fee_cents: feeCents,
        team_fee_cents: feeCents != null ? feeCents * 4 : null,
        primary_color: editForm.primary_color,
        secondary_color: editForm.secondary_color,
        logo_url: editForm.logo_url || null,
        hero_image_url: editForm.hero_image_url || null,
        prospect_name: editForm.prospect_name || null,
        prospect_email: editForm.prospect_email || null,
        prospect_phone: editForm.prospect_phone || null,
      } as never)
      .eq("id", editTarget.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sample updated", description: "The customer's link now shows the new details." });
    setEditTarget(null);
    await load();
  }

  async function openConvert(r: SampleRow) {
    setConvTarget(r);
    setConvForm({
      conversion_status: r.conversion_status === "converted" ? "converted" : "converted",
      converted_tournament_id: r.converted_tournament_id || "",
      conversion_notes: r.conversion_notes || "",
    });
    const { data } = await supabase
      .from("tournaments")
      .select("id, title")
      .order("created_at", { ascending: false })
      .limit(100);
    setLiveTournaments(((data as unknown) as { id: string; title: string }[]) || []);
  }

  async function saveConversion() {
    if (!convTarget) return;
    setSaving(true);
    const converted = convForm.conversion_status === "converted";
    const { error } = await supabase
      .from("sample_tournaments")
      .update({
        conversion_status: convForm.conversion_status,
        converted_tournament_id: convForm.converted_tournament_id || null,
        conversion_notes: convForm.conversion_notes || null,
        converted_at: converted ? convTarget.converted_at || new Date().toISOString() : null,
      } as never)
      .eq("id", convTarget.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: converted ? "Marked as converted" : "Conversion updated" });
    setConvTarget(null);
    await load();
  }

  async function remove(r: SampleRow) {
    if (!confirm(`Delete the sample "${r.tournament_name}"? The customer's link will stop working.`)) return;
    const { error } = await supabase.from("sample_tournaments").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sample deleted" });
    await load();
  }

  const total = rows.length;
  const sent = rows.filter((r) => r.conversion_status !== "created").length;
  const convertedCount = rows.filter((r) => r.conversion_status === "converted").length;
  const rate = sent ? Math.round((convertedCount / sent) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sample Tournaments</CardTitle>
          <CardDescription>
            Every sample you build appears here with who it was sent to. Edit the images and colors any time, and
            track which samples turn into paying events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Samples built", value: total },
              { label: "Shared with customers", value: sent },
              { label: "Converted", value: convertedCount },
              { label: "Conversion rate", value: `${rate}%` },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-2xl font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No samples yet. Build one in <strong>Build Customer Sample</strong> above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Sent to</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const b = statusBadge(r.conversion_status);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {r.logo_url ? (
                              <img src={r.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
                            ) : (
                              <div
                                className="h-8 w-8 rounded"
                                style={{ background: r.primary_color || "#1a5c38" }}
                              />
                            )}
                            <div>
                              <div className="font-medium">{r.tournament_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.event_date || "No date"} {r.location ? `• ${r.location}` : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{r.prospect_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.prospect_email || "No email"}</div>
                          <div className="text-xs text-muted-foreground">{r.prospect_phone || "No mobile"}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {r.view_count}
                          {r.tour_completed && <div className="text-xs text-emerald-600">Tour finished</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.variant}>{b.label}</Badge>
                          <Select value={r.conversion_status} onValueChange={(v) => setStatus(r, v)}>
                            <SelectTrigger className="mt-1 h-7 w-[170px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(linkFor(r));
                                toast({ title: "Link copied" });
                                markShared(r);
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy Link
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a href={`/sample/${r.unique_slug}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" /> Preview
                              </a>
                            </Button>
                            {r.prospect_email && (
                              <Button size="sm" variant="outline" asChild onClick={() => markShared(r)}>
                                <a
                                  href={`mailto:${r.prospect_email}?subject=${encodeURIComponent(
                                    `Your sample event page – ${r.tournament_name}`,
                                  )}&body=${encodeURIComponent(
                                    `Hi ${r.prospect_name || "there"},\n\nHere's the sample event page I built for ${r.tournament_name}: ${linkFor(r)}\n\nTake a look and let me know what you think. If you want, I can hop on a quick call to walk you through it.\n\n— Roderick`,
                                  )}`}
                                >
                                  <Mail className="h-3 w-3 mr-1" /> Email
                                </a>
                              </Button>
                            )}
                            {r.prospect_phone && (
                              <Button size="sm" variant="outline" asChild onClick={() => markShared(r)}>
                                <a
                                  href={`sms:${r.prospect_phone}?&body=${encodeURIComponent(
                                    `Hi ${r.prospect_name || "there"} — here's the sample event page for ${r.tournament_name}: ${linkFor(r)}`,
                                  )}`}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" /> Text
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[#1a5c38] text-white hover:bg-[#1a5c38]/90"
                              onClick={() => openConvert(r)}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {r.conversion_status === "converted" ? "Conversion" : "Convert"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit sample */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sample</DialogTitle>
            <DialogDescription>
              Update the event details, colors, and images the customer sees on their sample link.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Event Name</Label>
              <Input
                value={editForm.tournament_name}
                onChange={(e) => setEditForm({ ...editForm, tournament_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={editForm.event_date}
                onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Registration Fee ($)</Label>
              <Input
                type="number"
                value={editForm.registration_fee_dollars}
                onChange={(e) => setEditForm({ ...editForm, registration_fee_dollars: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Location</Label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Primary Color</Label>
              <Input
                type="color"
                className="h-10 w-24 p-1"
                value={editForm.primary_color}
                onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })}
              />
            </div>
            <div>
              <Label>Secondary Color</Label>
              <Input
                type="color"
                className="h-10 w-24 p-1"
                value={editForm.secondary_color}
                onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")}
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busyUpload} onClick={() => logoRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
                {editForm.logo_url && <img src={editForm.logo_url} alt="Logo" className="h-10 object-contain" />}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hero Image</Label>
              <input
                ref={heroRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "hero")}
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busyUpload} onClick={() => heroRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
                {editForm.hero_image_url && (
                  <img src={editForm.hero_image_url} alt="Hero" className="h-10 w-20 object-cover rounded" />
                )}
              </div>
            </div>
            <div className="sm:col-span-2 border-t pt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={editForm.prospect_name}
                  onChange={(e) => setEditForm({ ...editForm, prospect_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.prospect_email}
                  onChange={(e) => setEditForm({ ...editForm, prospect_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  value={editForm.prospect_phone}
                  onChange={(e) => setEditForm({ ...editForm, prospect_phone: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
            >
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversion tracking */}
      <Dialog open={!!convTarget} onOpenChange={(o) => !o && setConvTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert Sample</DialogTitle>
            <DialogDescription>
              {convTarget?.tournament_name} — record where this sample landed so you can track your conversions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={convForm.conversion_status}
                onValueChange={(v) => setConvForm({ ...convForm, conversion_status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Live event they became (optional)</Label>
              <Select
                value={convForm.converted_tournament_id || "none"}
                onValueChange={(v) => setConvForm({ ...convForm, converted_tournament_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not linked yet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked yet</SelectItem>
                  {liveTournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm"
                value={convForm.conversion_notes}
                onChange={(e) => setConvForm({ ...convForm, conversion_notes: e.target.value })}
                placeholder="What did they say? Next steps?"
              />
            </div>
            {convTarget?.prospect_email && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${convTarget.prospect_email}?subject=${encodeURIComponent(
                    `Ready to go live – ${convTarget.tournament_name}`,
                  )}&body=${encodeURIComponent(
                    `Hi ${convTarget.prospect_name || "there"},\n\nGlad you liked the sample for ${convTarget.tournament_name}. Here's the link to create your account and go live:\n\n${window.location.origin}/signup\n\nOnce you're in, I'll move your event details over so you can open registration right away.\n\n— Roderick`,
                  )}`}
                >
                  <Mail className="h-4 w-4 mr-1" /> Email signup link
                </a>
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveConversion}
              disabled={saving}
              className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold"
            >
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
