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
import { Plus, Pencil, Trash2, Loader2, Eye, DollarSign, Copy, ExternalLink } from "lucide-react";

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
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    benefits: "",
    display_order: "0",
  });

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  const fetchData = useCallback(async () => {
    if (!selectedTournament) return;
    setLoading(true);
    const [tiersRes, regsRes] = await Promise.all([
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
    ]);
    setTiers((tiersRes.data as SponsorshipTier[]) || []);
    setRegistrations((regsRes.data as SponsorRegistration[]) || []);
    setLoading(false);
  }, [selectedTournament]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", benefits: "", display_order: "0" });
    setEditTier(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !form.name.trim() || !form.price || demoGuard()) return;
    setSaving(true);
    const priceCents = Math.round(parseFloat(form.price) * 100);
    if (priceCents <= 0) { toast({ title: "Price must be greater than $0", variant: "destructive" }); setSaving(false); return; }

    const payload = {
      tournament_id: selectedTournament,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: priceCents,
      benefits: form.benefits.trim() || null,
      display_order: parseInt(form.display_order) || 0,
      is_active: true,
    };

    if (editTier) {
      const { error } = await supabase.from("sponsorship_tiers").update(payload).eq("id", editTier.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Tier updated" });
    } else {
      const { error } = await supabase.from("sponsorship_tiers").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Tier created" });
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
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    await supabase.from("sponsorship_tiers").delete().eq("id", id);
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
    const { error } = await supabase.from("sponsorship_tiers").insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: `${template.name} template applied!` });
    fetchData();
  };

  const getTierName = (tierId: string | null) => {
    if (!tierId) return "Custom";
    return tiers.find(t => t.id === tierId)?.name || "Unknown";
  };

  const sponsorUrl = selectedTournamentData?.slug
    ? `${window.location.origin}/t/${selectedTournamentData.slug}?tab=sponsors`
    : null;

  const totalPaid = registrations.filter(r => r.payment_status === "paid").reduce((s, r) => s + r.amount_cents, 0);
  const totalPending = registrations.filter(r => r.payment_status === "pending").reduce((s, r) => s + r.amount_cents, 0);

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
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-foreground">{tier.name}</h4>
                      <span className="text-primary font-mono font-semibold text-sm">{fmt(tier.price_cents)}</span>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sponsor Registrations</CardTitle>
            <div className="flex gap-3 text-xs">
              <span className="text-muted-foreground">Paid: <strong className="text-primary">{fmt(totalPaid)}</strong></span>
              <span className="text-muted-foreground">Pending: <strong className="text-secondary">{fmt(totalPending)}</strong></span>
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
                    <TableCell className="text-sm">{getTierName(reg.tier_id)}</TableCell>
                    <TableCell className="font-mono text-sm">{fmt(reg.amount_cents)}</TableCell>
                    <TableCell>
                      <Badge variant={reg.payment_status === "paid" ? "default" : "secondary"} className="text-xs">
                        {reg.payment_status === "paid" ? "✓ Paid" : reg.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(reg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell>
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
                              <div><span className="text-muted-foreground">Tier:</span> {getTierName(reg.tier_id)}</div>
                              <div><span className="text-muted-foreground">Amount:</span> {fmt(reg.amount_cents)}</div>
                              <div><span className="text-muted-foreground">Status:</span> {reg.payment_status}</div>
                              {reg.paid_at && <div><span className="text-muted-foreground">Paid:</span> {new Date(reg.paid_at).toLocaleString()}</div>}
                            </div>
                            {reg.description && <div><span className="text-muted-foreground">About:</span> {reg.description}</div>}
                          </div>
                        </DialogContent>
                      </Dialog>
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
