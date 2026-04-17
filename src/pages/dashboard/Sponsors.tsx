import { useEffect, useState, useCallback, useRef } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Award,
  Trophy,
  Plus,
  Loader2,
  Upload,
  Image,
  Trash2,
  Pencil,
  ExternalLink,
  DollarSign,
  FileImage,
  Check,
  Package,
  QrCode,
  Copy,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import SponsorshipTiersManager from "@/components/dashboard/SponsorshipTiersManager";

interface Sponsor {
  id: string;
  tournament_id: string;
  name: string;
  tier: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  amount: number | null;
  is_paid: boolean | null;
  sort_order: number | null;
  show_on_leaderboard: boolean;
  leaderboard_placement: string;
  display_order: number | null;
}

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
}

const tiers = [
  { value: "title", label: "Title Sponsor", color: "bg-secondary text-secondary-foreground" },
  { value: "platinum", label: "Platinum", color: "bg-foreground text-background" },
  { value: "gold", label: "Gold", color: "bg-secondary/80 text-secondary-foreground" },
  { value: "silver", label: "Silver", color: "bg-muted-foreground/20 text-foreground" },
  { value: "bronze", label: "Bronze", color: "bg-muted text-muted-foreground" },
  { value: "hole", label: "Hole Sponsor", color: "bg-primary/10 text-primary" },
  { value: "inkind", label: "In-Kind", color: "bg-muted text-muted-foreground" },
];

const tierOrder: Record<string, number> = { title: 0, platinum: 1, gold: 2, silver: 3, bronze: 4, hole: 5, inkind: 6 };

const assetTypes = [
  { value: "logo", label: "Logo" },
  { value: "hole_sign", label: "Hole Sign" },
  { value: "digital_ad", label: "Digital Ad" },
  { value: "banner", label: "Banner" },
  { value: "program_ad", label: "Program Ad" },
  { value: "other", label: "Other" },
];

function SponsorAssetManager({ sponsors, selectedTournament, orgId }: { sponsors: Sponsor[]; selectedTournament: string; orgId: string }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSponsorId, setUploadSponsorId] = useState("");
  const [uploadType, setUploadType] = useState("logo");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sponsor_assets").select("*").eq("tournament_id", selectedTournament).order("created_at", { ascending: false });
    setAssets(data || []);
    setLoading(false);
  }, [selectedTournament]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleUpload = async (file: File) => {
    if (!uploadSponsorId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${orgId}/${selectedTournament}/sponsor-assets/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);

    const { error: insertErr } = await supabase.from("sponsor_assets").insert({
      sponsor_id: uploadSponsorId,
      tournament_id: selectedTournament,
      asset_type: uploadType,
      asset_url: urlData.publicUrl,
      file_name: file.name,
      notes: uploadNotes || null,
    } as any);

    if (insertErr) { toast({ title: "Error", description: insertErr.message, variant: "destructive" }); }
    else { toast({ title: "Asset uploaded!" }); fetchAssets(); }
    setUploading(false);
    setUploadOpen(false);
    setUploadNotes("");
  };

  const markDelivered = async (assetId: string) => {
    await supabase.from("sponsor_assets").update({ status: "delivered", delivered_at: new Date().toISOString() } as any).eq("id", assetId);
    fetchAssets();
    toast({ title: "Marked as delivered" });
  };

  const deleteAsset = async (assetId: string) => {
    await supabase.from("sponsor_assets").delete().eq("id", assetId);
    setAssets(prev => prev.filter(a => a.id !== assetId));
    toast({ title: "Asset removed" });
  };

  const getSponsorName = (sponsorId: string) => sponsors.find(s => s.id === sponsorId)?.name || "Unknown";

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Sponsor Assets & Deliverables
          </CardTitle>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Upload className="h-3.5 w-3.5 mr-1" /> Upload Asset</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Sponsor Asset</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Sponsor</Label>
                  <Select value={uploadSponsorId} onValueChange={setUploadSponsorId}>
                    <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                    <SelectContent>
                      {sponsors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Asset Type</Label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="e.g. High-res for print" />
                </div>
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*,.pdf,.svg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
                      <>
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to select file</p>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No assets uploaded yet. Upload sponsor logos, hole signs, and digital ads.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{getSponsorName(a.sponsor_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {assetTypes.find(t => t.value === a.asset_type)?.label || a.asset_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a href={a.asset_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />{a.file_name || "View"}
                    </a>
                  </TableCell>
                  <TableCell>
                    {a.status === "delivered" ? (
                      <Badge className="bg-primary/10 text-primary text-xs"><Check className="h-3 w-3 mr-1" />Delivered</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status !== "delivered" && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markDelivered(a.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => deleteAsset(a.id)}>
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
  );
}

const DOMAIN = "www.teevents.golf";

function SponsorPageShareCard({
  tournamentSlug,
  tournamentTitle,
}: {
  tournamentSlug: string | null;
  tournamentTitle: string;
}) {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  if (!tournamentSlug) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="py-6 text-center">
          <QrCode className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Publish your tournament site to generate a sponsor page link & QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sponsorUrl = `https://${DOMAIN}/t/${tournamentSlug}?tab=sponsors`;

  const copyLink = () => {
    navigator.clipboard.writeText(sponsorUrl);
    toast({ title: "Copied!", description: "Sponsor page link copied to clipboard." });
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const size = 900;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const img = new window.Image();
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${tournamentSlug}-sponsor-qr.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
    };
    img.src = URL.createObjectURL(svgBlob);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          Sponsor Page Link & QR Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Link side */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Shareable Link
              </Label>
              <div className="mt-1.5 flex items-center gap-2 p-2.5 bg-muted/50 rounded-md border border-border">
                <code className="text-xs font-mono text-foreground break-all flex-1">
                  {sponsorUrl}
                </code>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={sponsorUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link to send sponsors directly to the sponsor section of{" "}
              <strong>{tournamentTitle}</strong>'s public tournament page, where they
              can review tiers and register.
            </p>
          </div>

          {/* QR side */}
          <div className="flex flex-col items-center gap-3">
            <div ref={qrRef} className="bg-white p-3 rounded-lg border border-border">
              <QRCodeSVG value={sponsorUrl} size={160} level="H" includeMargin fgColor="#1a5c38" />
            </div>
            <Button size="sm" variant="outline" onClick={downloadQR}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download QR (PNG)
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-[220px]">
              Print on flyers or display at events to attract sponsors.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const Sponsors = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSponsor, setEditSponsor] = useState<Sponsor | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lbInterval, setLbInterval] = useState(5000);
  const [lbStyle, setLbStyle] = useState("banner");
  const [form, setForm] = useState({
    name: "",
    tier: "silver",
    logo_url: "",
    website_url: "",
    description: "",
    amount: "",
    show_on_leaderboard: true,
    leaderboard_placement: "sidebar",
  });

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, slug")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  const fetchSponsors = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_sponsors")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("sort_order", { ascending: true });
    setSponsors((data as Sponsor[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSponsors();
    // Fetch leaderboard settings
    if (selectedTournament) {
      supabase.from("tournaments").select("leaderboard_sponsor_interval_ms, leaderboard_sponsor_style").eq("id", selectedTournament).single().then(({ data }) => {
        if (data) {
          setLbInterval((data as any).leaderboard_sponsor_interval_ms ?? 5000);
          setLbStyle((data as any).leaderboard_sponsor_style ?? "banner");
        }
      });
    }
  }, [selectedTournament]);

  const resetForm = () => {
    setForm({ name: "", tier: "silver", logo_url: "", website_url: "", description: "", amount: "", show_on_leaderboard: true, leaderboard_placement: "sidebar" });
    setEditSponsor(null);
  };

  const handleOpenEdit = (sponsor: Sponsor) => {
    setEditSponsor(sponsor);
    setForm({
      name: sponsor.name,
      tier: sponsor.tier,
      logo_url: sponsor.logo_url || "",
      website_url: sponsor.website_url || "",
      description: sponsor.description || "",
      amount: sponsor.amount?.toString() || "",
      show_on_leaderboard: sponsor.show_on_leaderboard ?? true,
      leaderboard_placement: sponsor.leaderboard_placement || "sidebar",
    });
    setDialogOpen(true);
  };

  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (!org || !selectedTournament) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${org.orgId}/${selectedTournament}/sponsors/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
      setUploading(false);
    },
    [org, selectedTournament, toast]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !form.name.trim() || demoGuard()) return;
    setSaving(true);

    const payload = {
      tournament_id: selectedTournament,
      name: form.name.trim(),
      tier: form.tier,
      logo_url: form.logo_url || null,
      website_url: form.website_url || null,
      description: form.description.trim() || null,
      amount: form.amount ? parseFloat(form.amount) : null,
      show_on_leaderboard: form.show_on_leaderboard,
      leaderboard_placement: form.leaderboard_placement,
    };

    if (editSponsor) {
      const { error } = await supabase.from("tournament_sponsors").update(payload).eq("id", editSponsor.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Sponsor updated" });
    } else {
      const { error } = await supabase.from("tournament_sponsors").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Sponsor added" });
    }

    resetForm();
    setDialogOpen(false);
    fetchSponsors();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    await supabase.from("tournament_sponsors").delete().eq("id", id);
    setSponsors((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Sponsor removed" });
  };

  // Group sponsors by tier
  const sortedSponsors = [...sponsors].sort(
    (a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99)
  );
  const grouped = tiers
    .map((t) => ({
      ...t,
      sponsors: sortedSponsors.filter((s) => s.tier === t.value),
    }))
    .filter((g) => g.sponsors.length > 0);

  const totalPledged = sponsors.reduce((s, sp) => s + Number(sp.amount || 0), 0);
  const totalPaid = sponsors.filter((s) => s.is_paid).reduce((s, sp) => s + Number(sp.amount || 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const tierBadge = (tier: string) => {
    const t = tiers.find((t) => t.value === tier);
    return t ? t : { label: tier, color: "bg-muted text-muted-foreground" };
  };

  if (loading && tournaments.length === 0) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <Award className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to manage sponsors.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Sponsors</h1>
          <p className="text-muted-foreground mt-1">Manage sponsor relationships and recognition.</p>
        </div>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[240px] bg-card">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTournament && (
        <SponsorPageShareCard
          tournamentSlug={tournaments.find((t) => t.id === selectedTournament)?.slug || null}
          tournamentTitle={tournaments.find((t) => t.id === selectedTournament)?.title || ""}
        />
      )}

      {selectedTournament && (
        <div className="mb-6">
          <SponsorshipTiersManager
            tournaments={tournaments}
            selectedTournament={selectedTournament}
          />
        </div>
      )}

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total Sponsors</span>
            <Award className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{sponsors.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total Pledged</span>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-display font-bold text-primary">{fmt(totalPledged)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Collected</span>
            <DollarSign className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-display font-bold text-secondary">{fmt(totalPaid)}</p>
        </motion.div>
      </div>

      {/* Add Button */}
      <div className="mb-6">
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" />Add Sponsor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editSponsor ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sponsor Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. ABC Corporation"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>Tier</Label>
                  <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiers.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <Label>Sponsor Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" className="h-14 w-14 object-contain rounded border border-border bg-muted" />
                  ) : (
                    <div className="h-14 w-14 bg-muted rounded border border-dashed border-border flex items-center justify-center">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Website URL</Label>
                <Input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://sponsor.com"
                  maxLength={500}
                />
              </div>

              <div>
                <Label>Sponsorship Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Sponsorship details, commitments, etc."
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="show_on_leaderboard"
                  checked={form.show_on_leaderboard}
                  onCheckedChange={(checked) => setForm({ ...form, show_on_leaderboard: !!checked })}
                />
                <Label htmlFor="show_on_leaderboard" className="text-sm font-normal cursor-pointer">
                  Show on Live Scoreboard & Leaderboard
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editSponsor ? "Update Sponsor" : "Add Sponsor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sponsors by Tier */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <Award className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No sponsors yet</h3>
          <p className="text-muted-foreground mb-4">Start adding sponsors for your tournament.</p>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add First Sponsor</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.value}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${group.color}`}>
                  {group.label}
                </span>
                <span className="text-xs">({group.sponsors.length})</span>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.sponsors.map((sponsor, i) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {sponsor.logo_url ? (
                        <img src={sponsor.logo_url} alt={sponsor.name} className="h-12 w-12 object-contain rounded border border-border bg-muted flex-shrink-0" />
                      ) : (
                        <div className="h-12 w-12 bg-muted rounded border border-border flex items-center justify-center flex-shrink-0">
                          <Award className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-foreground truncate">{sponsor.name}</h4>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierBadge(sponsor.tier).color}`}>
                          {tierBadge(sponsor.tier).label}
                        </span>
                      </div>
                    </div>

                    {sponsor.amount && (
                      <p className="text-sm font-mono font-medium text-primary mt-3">
                        {fmt(Number(sponsor.amount))}
                        {sponsor.is_paid && <span className="text-xs text-secondary ml-2">✓ Paid</span>}
                      </p>
                    )}

                    {sponsor.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{sponsor.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                      {sponsor.website_url && (
                        <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleOpenEdit(sponsor)} className="text-muted-foreground hover:text-foreground transition-colors ml-auto">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Sponsor</AlertDialogTitle>
                            <AlertDialogDescription>Remove {sponsor.name} from this tournament?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(sponsor.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sponsor Asset Management */}
      {selectedTournament && sponsors.length > 0 && (
        <SponsorAssetManager
          sponsors={sponsors}
          selectedTournament={selectedTournament}
          orgId={org?.orgId || ""}
        />
      )}

      {/* Leaderboard Sponsor Settings */}
      {selectedTournament && sponsors.some(s => s.show_on_leaderboard) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Leaderboard Sponsor Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-sm mb-2 block">Display Style</Label>
              <Select value={lbStyle} onValueChange={(val) => setLbStyle(val)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="banner">Rotating Banner</SelectItem>
                  <SelectItem value="ticker">Scrolling Ticker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lbStyle === "banner" && (
              <div>
                <Label className="text-sm mb-2 block">Rotation Speed: {(lbInterval / 1000).toFixed(1)}s</Label>
                <Slider
                  value={[lbInterval]}
                  onValueChange={([v]) => setLbInterval(v)}
                  min={2000}
                  max={15000}
                  step={500}
                  className="w-64"
                />
                <p className="text-xs text-muted-foreground mt-1">How long each sponsor is shown before rotating.</p>
              </div>
            )}
            <Button
              size="sm"
              onClick={async () => {
                const { error } = await supabase.from("tournaments").update({
                  leaderboard_sponsor_interval_ms: lbInterval,
                  leaderboard_sponsor_style: lbStyle,
                } as any).eq("id", selectedTournament);
                if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); }
                else { toast({ title: "Leaderboard settings saved!" }); }
              }}
            >
              Save Display Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Sponsors;
