import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

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
}

interface Tournament {
  id: string;
  title: string;
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

const Sponsors = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSponsor, setEditSponsor] = useState<Sponsor | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tier: "silver",
    logo_url: "",
    website_url: "",
    description: "",
    amount: "",
    show_on_leaderboard: true,
  });

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
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
  }, [selectedTournament]);

  const resetForm = () => {
    setForm({ name: "", tier: "silver", logo_url: "", website_url: "", description: "", amount: "", show_on_leaderboard: true });
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
    if (!selectedTournament || !form.name.trim()) return;
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
    </div>
  );
};

export default Sponsors;
