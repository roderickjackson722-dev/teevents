import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ExternalLink, Sparkles, Trash2, Upload, Image as ImageIcon, Send, Copy, RotateCw } from "lucide-react";
import { ImageCropperDialog, fileToDataUrl } from "@/components/ui/image-cropper-dialog";

interface DemoTournamentRow {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  course_name: string | null;
  slug: string | null;
  custom_slug: string | null;
  organization_id: string;
  site_hero_image_url: string | null;
  created_at: string;
  demo_prospect_email?: string | null;
  demo_prospect_name?: string | null;
  demo_conversion_token?: string | null;
  demo_conversion_sent_at?: string | null;
  demo_conversion_token_expires_at?: string | null;
  demo_conversion_used_at?: string | null;
  demo_conversion_discount_type?: string | null;
  demo_conversion_discount_value?: number | null;
  demo_conversion_is_test?: boolean | null;
  demo_converted_at?: string | null;
}

type DiscountType = "none" | "free_pro" | "percentage" | "fixed";

const SCORING_FORMATS = [
  { value: "stroke_play", label: "Stroke Play" },
  { value: "scramble", label: "Scramble" },
  { value: "best_ball", label: "Best Ball" },
  { value: "stableford", label: "Stableford" },
  { value: "modified_stableford", label: "Modified Stableford" },
  { value: "match_play", label: "Match Play" },
  { value: "shamble", label: "Shamble" },
  { value: "chapman", label: "Chapman" },
];

export default function DemoConverter() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [demos, setDemos] = useState<DemoTournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    tournament_name: "",
    event_date: "",
    location: "",
    course_name: "",
    registration_fee_dollars: "150",
    scoring_format: "scramble",
  });
  const [creating, setCreating] = useState(false);

  // image state
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Conversion modal
  const [convOpen, setConvOpen] = useState(false);
  const [convTarget, setConvTarget] = useState<DemoTournamentRow | null>(null);
  const [convForm, setConvForm] = useState({
    prospect_email: "",
    prospect_name: "",
    discount_type: "none" as DiscountType,
    discount_value: 0,
  });
  const [convSending, setConvSending] = useState(false);

  function openConvert(d: DemoTournamentRow) {
    setConvTarget(d);
    setConvForm({
      prospect_email: d.demo_prospect_email || "",
      prospect_name: d.demo_prospect_name || "",
      discount_type: (d.demo_conversion_discount_type as DiscountType) || "none",
      discount_value: d.demo_conversion_discount_value || 0,
    });
    setConvOpen(true);
  }

  function offerLine(type: DiscountType, value: number): string | null {
    switch (type) {
      case "free_pro": return "🔥 Special offer: Free Pro upgrade ($399 value — 100% off)";
      case "percentage": return value > 0 ? `🔥 Special offer: ${value}% off Pro` : null;
      case "fixed": return value > 0 ? `🔥 Special offer: $${value} off Pro` : null;
      default: return null;
    }
  }

  async function sendConversion(testMode: boolean) {
    if (!convTarget) return;
    if (!testMode && !convForm.prospect_email) {
      toast({ title: "Prospect email required", variant: "destructive" });
      return;
    }
    setConvSending(true);
    const { data, error } = await supabase.functions.invoke("prepare-demo-conversion", {
      body: {
        tournament_id: convTarget.id,
        prospect_email: convForm.prospect_email,
        prospect_name: convForm.prospect_name || null,
        app_base_url: window.location.origin,
        test_mode: testMode,
        discount: { type: convForm.discount_type, value: convForm.discount_value },
      },
    });
    setConvSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({
      title: testMode ? "Test email sent" : "Signup link sent",
      description: testMode ? `Sent to your admin email. Link valid 24h.` : `Sent to ${convForm.prospect_email}. Link valid 72h.`,
    });
    setConvOpen(false);
    await loadDemos();
  }

  function copyLink(d: DemoTournamentRow) {
    if (!d.demo_conversion_token) return;
    const url = `${window.location.origin}/claim-demo/${d.demo_conversion_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  }

  function statusOf(d: DemoTournamentRow): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
    if (d.demo_converted_at) return { label: "✅ Claimed", variant: "default" };
    if (!d.demo_conversion_token) return { label: "—", variant: "outline" };
    if (d.demo_conversion_token_expires_at && new Date(d.demo_conversion_token_expires_at) < new Date()) {
      return { label: "⏰ Expired", variant: "destructive" };
    }
    if (d.demo_conversion_is_test) return { label: "🔬 Test sent", variant: "secondary" };
    return { label: "⏳ Pending", variant: "secondary" };
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
      if (data) loadDemos();
    })();
  }, [navigate]);

  async function loadDemos() {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("id, title, date, location, course_name, slug, custom_slug, organization_id, site_hero_image_url, created_at, demo_prospect_email, demo_prospect_name, demo_conversion_token, demo_conversion_sent_at, demo_conversion_token_expires_at, demo_conversion_used_at, demo_conversion_discount_type, demo_conversion_discount_value, demo_conversion_is_test, demo_converted_at")
      .eq("is_demo", true)
      .order("created_at", { ascending: false });
    setDemos((data as DemoTournamentRow[]) || []);
    setLoading(false);
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    const src = await fileToDataUrl(f);
    setRawImageSrc(src);
    setCropOpen(true);
  }

  async function handleCropped(file: File) {
    setCroppedFile(file);
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setCroppedFile(null);
    if (croppedPreviewUrl) URL.revokeObjectURL(croppedPreviewUrl);
    setCroppedPreviewUrl(null);
    setRawImageSrc(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadHeroImage(): Promise<string | null> {
    if (!croppedFile) return null;
    const ts = Date.now();
    const safe = croppedFile.name.replace(/[^a-z0-9.]/gi, "_");
    const path = `demo-hero/${ts}_${safe}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, croppedFile, {
      contentType: croppedFile.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  async function createDemo() {
    if (!form.tournament_name.trim()) {
      toast({ title: "Tournament name required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      let hero_image_url: string | null = null;
      try {
        hero_image_url = await uploadHeroImage();
      } catch (upErr: any) {
        toast({ title: "Image upload failed", description: upErr.message, variant: "destructive" });
        setCreating(false);
        return;
      }
      const fee_cents = Math.round(parseFloat(form.registration_fee_dollars || "0") * 100);
      const { data, error } = await supabase.functions.invoke("create-demo-real-tournament", {
        body: {
          tournament_name: form.tournament_name,
          event_date: form.event_date || null,
          location: form.location,
          course_name: form.course_name,
          registration_fee_cents: fee_cents,
          scoring_format: form.scoring_format,
          hero_image_url,
        },
      });
      if (error || (data as any)?.error) {
        toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
        return;
      }
      toast({ title: "Demo tournament created", description: "12 mock players added. Open the dashboard to start your walkthrough." });
      setForm({ ...form, tournament_name: "", event_date: "", location: "", course_name: "" });
      clearImage();
      await loadDemos();
    } finally {
      setCreating(false);
    }
  }

  async function deleteDemo(id: string) {
    if (!confirm("Delete this demo tournament and all its mock data?")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", id).eq("is_demo", true);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    await loadDemos();
  }

  function slugOf(d: DemoTournamentRow) {
    return d.custom_slug || d.slug || d.id;
  }

  if (!authChecked) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
          <h1 className="text-xl font-semibold">Demo Converter</h1>
          <Badge variant="secondary" className="ml-2">Real tournaments for screen-share demos</Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Demo Tournament</CardTitle>
            <CardDescription>
              Creates a fully functional, real tournament under your <strong>Demo Sandbox</strong> organization with 12 mock players pre-loaded. Every dashboard tab works exactly like a live tournament.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tournament Name</Label>
                <Input value={form.tournament_name} onChange={(e) => setForm({ ...form, tournament_name: e.target.value })} placeholder="Spring Charity Classic" />
              </div>
              <div>
                <Label>Event Date</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Pebble Beach, CA" />
              </div>
              <div>
                <Label>Course</Label>
                <Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} placeholder="Pebble Beach Golf Links" />
              </div>
              <div>
                <Label>Registration Fee ($)</Label>
                <Input type="number" value={form.registration_fee_dollars} onChange={(e) => setForm({ ...form, registration_fee_dollars: e.target.value })} />
              </div>
              <div>
                <Label>Scoring Format</Label>
                <Select value={form.scoring_format} onValueChange={(v) => setForm({ ...form, scoring_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCORING_FORMATS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <Label>Hero Image (optional)</Label>
              <div className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 5MB. Recommended 16:9 (1920×1080).</div>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileChosen}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Choose File
                </Button>
                {croppedPreviewUrl ? (
                  <div className="relative">
                    <img src={croppedPreviewUrl} alt="Hero preview" className="w-64 h-36 object-cover rounded border border-border" />
                    <Button type="button" size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80" onClick={clearImage}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-64 h-36 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                    <ImageIcon className="h-4 w-4 mr-1" /> No image
                  </div>
                )}
                {rawImageSrc && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCropOpen(true)}>
                    Re-crop
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={createDemo} disabled={creating} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold">
              <Sparkles className="h-4 w-4 mr-2" />
              {creating ? "Creating…" : "Create Demo Tournament"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Demo Tournaments</CardTitle>
            <CardDescription>Click <strong>Open Dashboard</strong> to walk a prospect through every tab during a screen share.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : demos.length === 0 ? (
              <div className="text-sm text-muted-foreground">No demo tournaments yet. Create one above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {d.site_hero_image_url ? (
                          <img src={d.site_hero_image_url} alt="" className="w-16 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-10 rounded bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{d.title}</div>
                        <div className="text-xs text-muted-foreground">{d.course_name || d.location || ""}</div>
                      </TableCell>
                      <TableCell>{d.date || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90 font-semibold" asChild>
                            <a href={`/dashboard?admin_org=${d.organization_id}`} target="_blank" rel="noreferrer">
                              Open Dashboard <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/demo-converter/${d.id}`)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Prepare Demo
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/tournament/${slugOf(d)}`} target="_blank" rel="noreferrer">Public Site</a>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/live/${slugOf(d)}`} target="_blank" rel="noreferrer">Live Leaderboard</a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteDemo(d.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ImageCropperDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={rawImageSrc}
        defaultAspect="16:9"
        outputMime="image/jpeg"
        title="Crop Hero Image (16:9 recommended)"
        onCropped={handleCropped}
      />
    </div>
  );
}
