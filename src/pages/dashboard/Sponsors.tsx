import { useEffect, useState, useCallback, useRef } from "react";
import StickySaveBar from "@/components/dashboard/StickySaveBar";
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
import { Switch } from "@/components/ui/switch";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ManualEntryLimitModal from "@/components/ManualEntryLimitModal";
import { useManualEntryEnforcement } from "@/hooks/useManualEntryEnforcement";
import { ImageCropperDialog, fileToDataUrl } from "@/components/ui/image-cropper-dialog";
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
import { pickTournamentId } from "@/hooks/useTournamentIdParam";


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
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
                <label
                  className="cursor-pointer block"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const f = e.dataTransfer.files?.[0];
                    if (!f) return;
                    if (f.type.startsWith("image/") && f.type !== "image/svg+xml") {
                      setCropSrc(await fileToDataUrl(f));
                      setCropOpen(true);
                    } else {
                      handleUpload(f);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf,.svg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.type.startsWith("image/") && f.type !== "image/svg+xml") {
                        setCropSrc(await fileToDataUrl(f));
                        setCropOpen(true);
                      } else {
                        handleUpload(f);
                      }
                    }}
                  />
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                    {uploading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : (
                      <>
                        <FileImage className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Click to select file or drag & drop here</p>
                        <p className="text-xs text-muted-foreground mt-1">Images, PDF, or SVG</p>
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
      <ImageCropperDialog
        open={cropOpen}
        onOpenChange={(o) => { setCropOpen(o); if (!o) setCropSrc(null); }}
        imageSrc={cropSrc}
        defaultAspect="free"
        title="Crop Sponsor Asset"
        onCropped={(file) => handleUpload(file)}
      />
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

function SponsorLogoSizeCard({ tournamentId }: { tournamentId: string }) {
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [size, setSize] = useState<string>("medium");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("sponsor_logo_display_size")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSize(((data as any)?.sponsor_logo_display_size as string) || "medium");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const save = async (newSize: string) => {
    if (demoGuard()) return;
    setSize(newSize);
    const { error } = await supabase
      .from("tournaments")
      .update({ sponsor_logo_display_size: newSize } as any)
      .eq("id", tournamentId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Sponsor logo size updated", description: "Refresh the public page to see the change." });
  };

  const options = [
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
    { value: "xlarge", label: "Extra Large" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          Sponsor Logo Display Size
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          Controls how large sponsor logos appear in the "Thank You Sponsors" section on your public tournament page. All logos render at a uniform size for a consistent look.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={size === o.value ? "default" : "outline"}
              disabled={loading}
              onClick={() => save(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SponsorPublicDisplayCard({ tournamentId }: { tournamentId: string }) {
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("show_sponsorships")
      .eq("id", tournamentId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setEnabled(((data as any)?.show_sponsorships ?? true) as boolean);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [tournamentId]);

  const save = async (next: boolean) => {
    if (demoGuard()) return;
    setEnabled(next);
    const { error } = await supabase
      .from("tournaments")
      .update({ show_sponsorships: next } as any)
      .eq("id", tournamentId);
    if (error) {
      setEnabled(!next);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: next ? "Sponsorships shown on public page" : "Sponsorships hidden from public page",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          Public Display
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Show sponsorships on public tournament page</p>
            <p className="text-sm text-muted-foreground mt-1">
              When enabled, the Sponsors tab will appear on your public tournament page. When disabled, the Sponsors tab will be hidden.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Note: If you have no active sponsorship tiers or sponsors, the section will not appear even if this toggle is on.
            </p>
          </div>
          <Switch checked={enabled} disabled={loading} onCheckedChange={save} />
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
  const manualEntry = useManualEntryEnforcement(selectedTournament || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSponsor, setEditSponsor] = useState<Sponsor | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoCropOpen, setLogoCropOpen] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
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
        if (list.length > 0) setSelectedTournament(pickTournamentId(list));
        setLoading(false);
      });
  }, [org]);

  const [regStats, setRegStats] = useState<{ count: number; pledged: number; collected: number }>({
    count: 0,
    pledged: 0,
    collected: 0,
  });

  const fetchSponsors = async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const [{ data }, { data: regs }] = await Promise.all([
      supabase
        .from("tournament_sponsors")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("sort_order", { ascending: true }),
      supabase
        .from("sponsor_registrations")
        .select("amount_cents, payment_status, manually_approved")
        .eq("tournament_id", selectedTournament),
    ]);
    setSponsors((data as Sponsor[]) || []);
    const rlist = (regs as any[]) || [];
    // Pledged = every sponsor registration entered (any status except refunded/cancelled/failed)
    const pledged = rlist
      .filter((r) => !["refunded", "cancelled", "failed"].includes(String(r.payment_status || "").toLowerCase()))
      .reduce((s, r) => s + Number(r.amount_cents || 0), 0) / 100;
    // Collected = only registrations actually marked paid — matches what Finances / platform_transactions record.
    // (manually_approved alone does NOT count as collected; the organizer must mark it paid.)
    const collected =
      rlist
        .filter((r) => String(r.payment_status || "").toLowerCase() === "paid")
        .reduce((s, r) => s + Number(r.amount_cents || 0), 0) / 100;
    setRegStats({ count: rlist.length, pledged, collected });
    setLoading(false);
  };

  useEffect(() => {
    fetchSponsors();
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
    if (!editSponsor) {
      const amtCents = Math.round((form.amount ? parseFloat(form.amount) : 0) * 100);
      const proceed = await manualEntry.guard("sponsor", amtCents);
      if (!proceed) return;
    }
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
      <ManualEntryLimitModal
        open={!!manualEntry.pending}
        onOpenChange={(o) => { if (!o) manualEntry.cancelPending(); }}
        used={manualEntry.pending?.used ?? 0}
        freeLimit={manualEntry.pending?.limit ?? 10}
        initialAmountCents={manualEntry.pending?.amountCents ?? 0}
        hasStripe={manualEntry.pending?.hasStripe ?? true}
        submitting={manualEntry.submitting}
        onConfirm={manualEntry.confirmPending}
      />
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
        <SponsorPublicDisplayCard tournamentId={selectedTournament} />
      )}

      {selectedTournament && (
        <SponsorLogoSizeCard tournamentId={selectedTournament} />
      )}

      {/* Scoring-page + leaderboard sponsor selection now lives in Scoring → Sponsors tab. */}




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
          <p className="text-2xl font-display font-bold text-foreground">{regStats.count}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total Pledged</span>
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-display font-bold text-primary">{fmt(regStats.pledged)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Collected</span>
            <DollarSign className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-2xl font-display font-bold text-secondary">{fmt(regStats.collected)}</p>
        </motion.div>
      </div>

      {/* Legacy add/edit dialog kept available via SponsorshipTiersManager — old grouped view removed to avoid duplication */}

      {/* Old grouped sponsor display removed — sponsors now show in unified Sponsor Registrations list above */}

      {/* Sponsor Asset Management */}
      {selectedTournament && sponsors.length > 0 && (
        <SponsorAssetManager
          sponsors={sponsors}
          selectedTournament={selectedTournament}
          orgId={org?.orgId || ""}
        />
      )}


      <ImageCropperDialog
        open={logoCropOpen}
        onOpenChange={(o) => { setLogoCropOpen(o); if (!o) setLogoCropSrc(null); }}
        imageSrc={logoCropSrc}
        defaultAspect="free"
        outputMime="image/png"
        title="Crop Sponsor Logo (any shape — wide, square, or tall)"
        onCropped={(file) => handleLogoUpload(file)}
      />
      <StickySaveBar onSave={() => {}} />
    </div>
  );
};

export default Sponsors;
