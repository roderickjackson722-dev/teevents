import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Eye, DollarSign, Copy, ExternalLink, Upload, Image as ImageIcon } from "lucide-react";

interface SponsorshipTier {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  benefits: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  total_spots: number | null;
  spots_used: number;
  package_type: string | null;
}

interface SponsorRegistration {
  id: string;
  tournament_id: string;
  tier_id: string | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  amount_cents: number;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
  show_on_public?: boolean;
  manually_approved?: boolean;
  _source?: "registration" | "legacy";
  _legacyTier?: string | null;
}

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const tierTemplates: Record<string, { name: string; tiers: { name: string; price_cents: number; benefits: string }[] }> = {
  nonprofit: {
    name: "Nonprofit Charity",
    tiers: [
      { name: "Title Sponsor", price_cents: 500000, benefits: "• Exclusive title naming rights\n• Logo on all materials\n• 8 complimentary player spots\n• VIP reception access\n• Social media promotion" },
      { name: "Gold Sponsor", price_cents: 250000, benefits: "• Logo on website & signage\n• 4 complimentary player spots\n• Social media shoutout\n• Recognition during awards" },
      { name: "Silver Sponsor", price_cents: 100000, benefits: "• Logo on website\n• 2 complimentary player spots\n• Recognition on event signage" },
      { name: "Hole Sponsor", price_cents: 50000, benefits: "• Custom sign at sponsored hole\n• Company name on scorecards\n• Social media mention" },
    ],
  },
  corporate: {
    name: "Corporate Outing",
    tiers: [
      { name: "Platinum Sponsor", price_cents: 1000000, benefits: "• Presenting sponsor recognition\n• Logo on all materials\n• 8 player spots\n• VIP dinner table\n• Banner at first tee" },
      { name: "Gold Sponsor", price_cents: 500000, benefits: "• Logo on website & event signage\n• 4 player spots\n• Recognition at awards dinner" },
      { name: "Silver Sponsor", price_cents: 250000, benefits: "• Logo on website\n• 2 player spots\n• Event program listing" },
      { name: "Bronze Sponsor", price_cents: 100000, benefits: "• Logo on website\n• Event program listing" },
    ],
  },
  club: {
    name: "Club Championship",
    tiers: [
      { name: "Gold Sponsor", price_cents: 100000, benefits: "• Logo on website & scorecards\n• Tee box sign\n• Social media promotion" },
      { name: "Silver Sponsor", price_cents: 50000, benefits: "• Logo on website\n• Tee box sign" },
      { name: "Hole Sponsor", price_cents: 25000, benefits: "• Custom sign at sponsored hole" },
    ],
  },
};

interface Props {
  tournaments: Tournament[];
  selectedTournament: string;
}

const SponsorshipTiersManager = ({ tournaments, selectedTournament }: Props) => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
  const [registrations, setRegistrations] = useState<SponsorRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTier, setEditTier] = useState<SponsorshipTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewReg, setViewReg] = useState<SponsorRegistration | null>(null);
  const [regDialogOpen, setRegDialogOpen] = useState(false);
  const [editReg, setEditReg] = useState<SponsorRegistration | null>(null);
  const [savingReg, setSavingReg] = useState(false);
  const [regForm, setRegForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    description: "",
    logo_url: "",
    tier_id: "",
    amount: "",
    payment_status: "pending",
    show_on_public: true,
    manually_approved: false,
  });
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    benefits: "",
    display_order: "0",
    total_spots: "",
    package_type: "",
  });

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  const fetchData = useCallback(async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const [tiersRes, regsRes, legacyRes] = await Promise.all([
      supabase
        .from("sponsorship_tiers")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("display_order", { ascending: true }),
      supabase
        .from("sponsor_registrations")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false }),
      supabase
        .from("tournament_sponsors")
        .select("*")
        .eq("tournament_id", selectedTournament)
        .order("created_at", { ascending: false }),
    ]);
    const regs: SponsorRegistration[] = ((regsRes.data as any[]) || []).map(r => ({ ...r, _source: "registration" as const }));
    const legacy: SponsorRegistration[] = ((legacyRes.data as any[]) || []).map((s: any) => ({
      id: s.id,
      tournament_id: s.tournament_id,
      tier_id: null,
      company_name: s.name || "",
      contact_name: "",
      contact_email: "",
      contact_phone: null,
      website_url: s.website_url || null,
      description: s.description || null,
      logo_url: s.logo_url || null,
      amount_cents: Math.round(Number(s.amount || 0) * 100),
      payment_status: s.is_paid ? "paid" : "pending",
      paid_at: null,
      created_at: s.created_at,
      _source: "legacy" as const,
      _legacyTier: s.tier || null,
    }));
    const merged = [...regs, ...legacy].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTiers((tiersRes.data as SponsorshipTier[]) || []);
    setRegistrations(merged);
    setLoading(false);
  }, [selectedTournament]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", benefits: "", display_order: "0", total_spots: "", package_type: "" });
    setEditTier(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !form.name.trim() || !form.price || demoGuard()) return;
    setSaving(true);
    const priceCents = Math.round(parseFloat(form.price) * 100);
    if (priceCents <= 0) { toast({ title: "Price must be greater than $0", variant: "destructive" }); setSaving(false); return; }

    const totalSpotsParsed = form.total_spots.trim() === "" ? null : Math.max(0, parseInt(form.total_spots, 10));
    const payload = {
      tournament_id: selectedTournament,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: priceCents,
      benefits: form.benefits.trim() || null,
      display_order: parseInt(form.display_order) || 0,
      is_active: true,
      total_spots: Number.isFinite(totalSpotsParsed as number) ? totalSpotsParsed : null,
      package_type: form.package_type || null,
    };

    const { data, error } = await supabase.functions.invoke("manage-sponsorship-tiers", {
      body: {
        action: editTier ? "update" : "create",
        tournament_id: selectedTournament,
        tier_id: editTier?.id,
        payload,
      },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error.message, variant: "destructive" });
    } else {
      toast({ title: editTier ? "Tier updated" : "Tier created" });
    }
    resetForm();
    setDialogOpen(false);
    fetchData();
    setSaving(false);
  };

  const handleEdit = (tier: SponsorshipTier) => {
    setEditTier(tier);
    setForm({
      name: tier.name,
      description: tier.description || "",
      price: (tier.price_cents / 100).toFixed(2),
      benefits: tier.benefits || "",
      display_order: String(tier.display_order),
      total_spots: tier.total_spots == null ? "" : String(tier.total_spots),
      package_type: tier.package_type || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    const { data, error } = await supabase.functions.invoke("manage-sponsorship-tiers", {
      body: { action: "delete", tier_id: id },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tier deleted" });
    fetchData();
  };

  const applyTemplate = async (templateKey: string) => {
    if (demoGuard()) return;
    const template = tierTemplates[templateKey];
    if (!template) return;
    const inserts = template.tiers.map((t, i) => ({
      tournament_id: selectedTournament,
      name: t.name,
      price_cents: t.price_cents,
      benefits: t.benefits,
      display_order: i + 1,
      is_active: true,
    }));
    const { data, error } = await supabase.functions.invoke("manage-sponsorship-tiers", {
      body: {
        action: "apply_template",
        tournament_id: selectedTournament,
        tiers: inserts,
      },
    });
    if (error || data?.error) toast({ title: "Error", description: data?.error || error.message, variant: "destructive" });
    else toast({ title: `${template.name} template applied!` });
    fetchData();
  };

  const getTierName = (reg: SponsorRegistration) => {
    if (reg._source === "legacy") {
      const map: Record<string, string> = {
        title: "Title Sponsor", platinum: "Platinum", gold: "Gold",
        silver: "Silver", bronze: "Bronze", hole: "Hole Sponsor", inkind: "In-Kind",
      };
      return reg._legacyTier ? (map[reg._legacyTier] || reg._legacyTier) : "Custom";
    }
    if (!reg.tier_id) return "Custom";
    return tiers.find(t => t.id === reg.tier_id)?.name || "Unknown";
  };

  const sponsorUrl = selectedTournamentData?.slug
    ? `${window.location.origin}/t/${selectedTournamentData.slug}#become-a-sponsor`
    : null;

  const totalPaid = registrations.filter(r => r.payment_status === "paid").reduce((s, r) => s + r.amount_cents, 0);
  const totalPending = registrations.filter(r => r.payment_status === "pending").reduce((s, r) => s + r.amount_cents, 0);

  const resetRegForm = () => {
    setEditReg(null);
    setRegForm({
      company_name: "", contact_name: "", contact_email: "", contact_phone: "",
      website_url: "", description: "", logo_url: "", tier_id: "", amount: "",
      payment_status: "pending", show_on_public: true, manually_approved: false,
    });
  };

  const handleOpenRegEdit = (reg: SponsorRegistration) => {
    setEditReg(reg);
    setRegForm({
      company_name: reg.company_name || "",
      contact_name: reg.contact_name || "",
      contact_email: reg.contact_email || "",
      contact_phone: reg.contact_phone || "",
      website_url: reg.website_url || "",
      description: reg.description || "",
      logo_url: reg.logo_url || "",
      tier_id: reg.tier_id || "",
      amount: ((reg.amount_cents || 0) / 100).toFixed(2),
      payment_status: reg.payment_status || "pending",
      show_on_public: reg.show_on_public !== false,
      manually_approved: !!reg.manually_approved,
    });
    setRegDialogOpen(true);
  };

  const handleRegLogoUpload = async (file: File) => {
    if (!org) return;
    const ext = file.name.split(".").pop();
    const path = `${org.orgId}/${selectedTournament}/sponsors/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setRegForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
  };

  const handleSaveReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demoGuard()) return;
    if (!regForm.company_name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    setSavingReg(true);
    const tierMatch = tiers.find(t => t.id === regForm.tier_id);
    const amountCents = regForm.amount
      ? Math.round(parseFloat(regForm.amount) * 100)
      : (tierMatch?.price_cents ?? 0);

    const payload = {
      company_name: regForm.company_name.trim(),
      contact_name: regForm.contact_name.trim(),
      contact_email: regForm.contact_email.trim(),
      contact_phone: regForm.contact_phone.trim() || null,
      website_url: regForm.website_url.trim() || null,
      description: regForm.description.trim() || null,
      logo_url: regForm.logo_url || null,
      tier_id: regForm.tier_id || null,
      amount_cents: amountCents,
      payment_status: regForm.payment_status,
      show_on_public: regForm.show_on_public,
      manually_approved: regForm.manually_approved,
    };

    // If editing a legacy tournament_sponsors row, migrate it: delete legacy + create new registration
    const isLegacyEdit = editReg && (editReg as any)._source === "legacy";
    const { data, error } = await supabase.functions.invoke("manage-sponsorship-tiers", {
      body: {
        action: editReg && !isLegacyEdit ? "update_registration" : "create_registration",
        tournament_id: selectedTournament,
        registration_id: editReg && !isLegacyEdit ? editReg.id : undefined,
        payload,
      },
    });
    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      if (isLegacyEdit && editReg) {
        await supabase.from("tournament_sponsors").delete().eq("id", editReg.id);
      }
      toast({ title: editReg ? "Sponsor updated" : "Sponsor added" });
      resetRegForm();
      setRegDialogOpen(false);
      fetchData();
    }
    setSavingReg(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Sponsorship Tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Sponsorship Tiers
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Tier</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display">{editTier ? "Edit Tier" : "Add Sponsorship Tier"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                  <div>
                    <Label>Tier Name *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gold Sponsor" required maxLength={100} />
                  </div>
                  <div>
                    <Label>Price ($) *</Label>
                    <Input type="number" step="0.01" min="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="1000.00" required />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description of this tier" maxLength={200} />
                  </div>
                  <div>
                    <Label>Benefits</Label>
                    <Textarea value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} placeholder="• Logo on tournament website&#10;• Social media shoutout&#10;• 2 complimentary player spots" rows={5} maxLength={1000} />
                    <p className="text-xs text-muted-foreground mt-1">Use bullet points (•) for each benefit, one per line.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Total Spots</Label>
                      <Input type="number" min="0" value={form.total_spots} onChange={e => setForm({ ...form, total_spots: e.target.value })} placeholder="Unlimited" />
                      <p className="text-xs text-muted-foreground mt-1">Leave blank for unlimited.</p>
                    </div>
                    <div>
                      <Label>Package Type</Label>
                      <Select value={form.package_type || "_none"} onValueChange={(v) => setForm({ ...form, package_type: v === "_none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— None —</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="presenting">Presenting</SelectItem>
                          <SelectItem value="hole">Hole</SelectItem>
                          <SelectItem value="beverage">Beverage</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Display Order</Label>
                    <Input type="number" min="0" value={form.display_order} onChange={e => setForm({ ...form, display_order: e.target.value })} />
                    <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    {editTier ? "Update Tier" : "Save Tier"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">No sponsorship tiers yet. Use a template to get started:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(tierTemplates).map(([key, tmpl]) => (
                  <Button key={key} variant="outline" size="sm" onClick={() => applyTemplate(key)}>
                    {tmpl.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {tiers.map(tier => (
                <div key={tier.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-bold text-foreground">{tier.name}</h4>
                      <span className="text-primary font-mono font-semibold text-sm">{fmt(tier.price_cents)}</span>
                      {tier.package_type && <Badge variant="outline" className="text-xs capitalize">{tier.package_type}</Badge>}
                      {tier.total_spots != null && (() => {
                        const remaining = Math.max(0, tier.total_spots - (tier.spots_used || 0));
                        return (
                          <Badge variant={remaining === 0 ? "destructive" : "secondary"} className="text-xs">
                            {remaining === 0 ? "Sold Out" : `${remaining} of ${tier.total_spots} left`}
                          </Badge>
                        );
                      })()}
                      {!tier.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    {tier.description && <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>}
                    {tier.benefits && (
                      <div className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{tier.benefits}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(tier)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tier</AlertDialogTitle>
                          <AlertDialogDescription>Delete "{tier.name}"? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tier.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              {tiers.length > 0 && sponsorUrl && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Share this link with potential sponsors:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{sponsorUrl}</code>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(sponsorUrl); toast({ title: "Link copied!" }); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sponsor Registrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Sponsor Registrations</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex gap-3 text-xs">
                <span className="text-muted-foreground">Paid: <strong className="text-primary">{fmt(totalPaid)}</strong></span>
                <span className="text-muted-foreground">Pending: <strong className="text-secondary">{fmt(totalPending)}</strong></span>
              </div>
              <Dialog open={regDialogOpen} onOpenChange={(v) => { setRegDialogOpen(v); if (!v) resetRegForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Sponsor</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">{editReg ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveReg} className="space-y-3 mt-2">
                    <div>
                      <Label>Company Name *</Label>
                      <Input value={regForm.company_name} onChange={e => setRegForm({ ...regForm, company_name: e.target.value })} required maxLength={200} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Contact Name</Label>
                        <Input value={regForm.contact_name} onChange={e => setRegForm({ ...regForm, contact_name: e.target.value })} maxLength={200} />
                      </div>
                      <div>
                        <Label>Contact Email</Label>
                        <Input type="email" value={regForm.contact_email} onChange={e => setRegForm({ ...regForm, contact_email: e.target.value })} maxLength={320} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Phone</Label>
                        <Input value={regForm.contact_phone} onChange={e => setRegForm({ ...regForm, contact_phone: e.target.value })} maxLength={50} />
                      </div>
                      <div>
                        <Label>Website</Label>
                        <Input value={regForm.website_url} onChange={e => setRegForm({ ...regForm, website_url: e.target.value })} placeholder="https://" maxLength={500} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tier</Label>
                        <Select value={regForm.tier_id || "_custom"} onValueChange={(v) => {
                          const tierVal = v === "_custom" ? "" : v;
                          const matched = tiers.find(t => t.id === tierVal);
                          setRegForm(prev => ({
                            ...prev,
                            tier_id: tierVal,
                            amount: matched && !prev.amount ? (matched.price_cents / 100).toFixed(2) : prev.amount,
                          }));
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_custom">Custom (no tier)</SelectItem>
                            {tiers.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {fmt(t.price_cents)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Amount ($)</Label>
                        <Input type="number" step="0.01" min="0" value={regForm.amount} onChange={e => setRegForm({ ...regForm, amount: e.target.value })} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <Label>Payment Status</Label>
                      <Select value={regForm.payment_status} onValueChange={(v) => setRegForm({ ...regForm, payment_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Logo</Label>
                      <div className="flex items-center gap-3 mt-1">
                        {regForm.logo_url ? (
                          <div className="h-14 w-24 rounded border border-border bg-muted flex items-center justify-center p-1 overflow-hidden">
                            <img src={regForm.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-14 w-24 bg-muted rounded border border-dashed border-border flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0]; e.target.value = "";
                            if (f) await handleRegLogoUpload(f);
                          }} />
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted">
                            <Upload className="h-4 w-4" /> {regForm.logo_url ? "Replace" : "Upload"}
                          </span>
                        </label>
                        {regForm.logo_url && (
                          <button type="button" onClick={() => setRegForm(prev => ({ ...prev, logo_url: "" }))} className="text-xs text-destructive hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={regForm.description} onChange={e => setRegForm({ ...regForm, description: e.target.value })} rows={2} maxLength={2000} />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingReg}>
                      {savingReg && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      {editReg ? "Update Sponsor" : "Add Sponsor"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sponsor registrations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Show on Public</TableHead>
                  <TableHead className="text-center">Override Pending</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map(reg => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {reg.logo_url && <img src={reg.logo_url} alt="" className="h-6 w-6 object-contain rounded" />}
                        <div>
                          <p className="font-medium text-sm">{reg.company_name}</p>
                          <p className="text-xs text-muted-foreground">{reg.contact_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getTierName(reg)}</TableCell>
                    <TableCell className="font-mono text-sm">{fmt(reg.amount_cents)}</TableCell>
                    <TableCell>
                      <Select
                        value={reg.payment_status}
                        onValueChange={async (newStatus) => {
                          if (demoGuard()) return;
                          let error: any = null, data: any = null;
                          if (reg._source === "legacy") {
                            const res = await supabase.from("tournament_sponsors")
                              .update({ is_paid: newStatus === "paid" })
                              .eq("id", reg.id);
                            error = res.error;
                          } else {
                            const res = await supabase.functions.invoke("manage-sponsorship-tiers", {
                              body: { action: "update_registration_status", registration_id: reg.id, status: newStatus },
                            });
                            data = res.data; error = res.error;
                          }
                          if (error || data?.error) {
                            toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
                          } else {
                            toast({ title: "Status updated" });
                            fetchData();
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(reg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenRegEdit(reg)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setViewReg(reg)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{reg.company_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              {reg.logo_url && <img src={reg.logo_url} alt="" className="h-16 w-16 object-contain rounded border border-border" />}
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground">Contact:</span> {reg.contact_name}</div>
                                <div><span className="text-muted-foreground">Email:</span> {reg.contact_email}</div>
                                {reg.contact_phone && <div><span className="text-muted-foreground">Phone:</span> {reg.contact_phone}</div>}
                                {reg.website_url && (
                                  <div>
                                    <a href={reg.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                      <ExternalLink className="h-3 w-3" /> Website
                                    </a>
                                  </div>
                                )}
                                <div><span className="text-muted-foreground">Tier:</span> {getTierName(reg)}</div>
                                <div><span className="text-muted-foreground">Amount:</span> {fmt(reg.amount_cents)}</div>
                                <div><span className="text-muted-foreground">Status:</span> {reg.payment_status}</div>
                                {reg.paid_at && <div><span className="text-muted-foreground">Paid:</span> {new Date(reg.paid_at).toLocaleString()}</div>}
                              </div>
                              {reg.description && <div><span className="text-muted-foreground">About:</span> {reg.description}</div>}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove sponsor registration?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes <strong>{reg.company_name}</strong> from this tournament's sponsor list. This cannot be undone. If a payment was already collected, refund it separately in Stripe.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  if (demoGuard()) return;
                                  let error: any = null, data: any = null;
                                  if (reg._source === "legacy") {
                                    const res = await supabase.from("tournament_sponsors").delete().eq("id", reg.id);
                                    error = res.error;
                                  } else {
                                    const res = await supabase.functions.invoke("manage-sponsorship-tiers", {
                                      body: { action: "delete_registration", registration_id: reg.id },
                                    });
                                    data = res.data; error = res.error;
                                  }
                                  if (error || data?.error) {
                                    toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
                                  } else {
                                    toast({ title: "Sponsor removed" });
                                    fetchData();
                                  }
                                }}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  );
};

export default SponsorshipTiersManager;
