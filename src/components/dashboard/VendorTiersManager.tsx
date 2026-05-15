import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Copy, ExternalLink, Store } from "lucide-react";

interface VendorTier {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  benefits: string | null;
  display_order: number;
  is_active: boolean;
  total_spots: number | null;
  spots_used: number;
}

interface Tournament {
  id: string;
  title: string;
  slug: string | null;
}

interface Props {
  tournament: Tournament | null;
}

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

const VendorTiersManager = ({ tournament }: Props) => {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<VendorTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<VendorTier | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price_dollars: "",
    benefits: "",
    total_spots: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    if (!tournament) { setTiers([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_tiers")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Failed to load vendor packages", description: error.message, variant: "destructive" });
    } else {
      setTiers((data as VendorTier[]) || []);
    }
    setLoading(false);
  }, [tournament, toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingTier(null);
    setForm({ name: "", description: "", price_dollars: "", benefits: "", total_spots: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (t: VendorTier) => {
    setEditingTier(t);
    setForm({
      name: t.name,
      description: t.description || "",
      price_dollars: (t.price_cents / 100).toString(),
      benefits: t.benefits || "",
      total_spots: t.total_spots != null ? String(t.total_spots) : "",
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!tournament) return;
    if (!form.name.trim()) {
      toast({ title: "Package name required", variant: "destructive" }); return;
    }
    const priceCents = Math.round(parseFloat(form.price_dollars || "0") * 100);
    if (!priceCents || priceCents <= 0) {
      toast({ title: "Enter a price greater than $0", variant: "destructive" }); return;
    }
    const totalSpots = form.total_spots.trim() === "" ? null : parseInt(form.total_spots, 10);
    if (totalSpots != null && (Number.isNaN(totalSpots) || totalSpots < 1)) {
      toast({ title: "Total spots must be a positive number or blank for unlimited", variant: "destructive" }); return;
    }

    setSaving(true);
    const payload = {
      tournament_id: tournament.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_cents: priceCents,
      benefits: form.benefits.trim() || null,
      total_spots: totalSpots,
      is_active: form.is_active,
    };

    if (editingTier) {
      const { error } = await supabase.from("vendor_tiers").update(payload).eq("id", editingTier.id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Package updated" });
        setDialogOpen(false);
        load();
      }
    } else {
      const nextOrder = tiers.length > 0 ? Math.max(...tiers.map(t => t.display_order || 0)) + 1 : 0;
      const { error } = await supabase.from("vendor_tiers").insert({ ...payload, display_order: nextOrder });
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Package created" });
        setDialogOpen(false);
        load();
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("vendor_tiers").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Package deleted" });
      load();
    }
  };

  const toggleActive = async (t: VendorTier) => {
    const { error } = await supabase.from("vendor_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const publicUrl = tournament?.slug ? `${window.location.origin}/t/${tournament.slug}/vendor` : null;

  if (!tournament) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a tournament to manage vendor packages.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Vendor Packages</CardTitle>
          <CardDescription>
            Create booth packages with set prices and spot limits. Vendors register and pay instantly online.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {publicUrl && (
            <>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copied" }); }}>
                <Copy className="h-4 w-4 mr-2" /> Copy link
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Public page</a>
              </Button>
            </>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> New Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTier ? "Edit Vendor Package" : "New Vendor Package"}</DialogTitle>
                <DialogDescription>
                  Vendors will see and pick from these packages, then pay via Stripe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Package Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Food Vendor Booth" maxLength={120} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (USD) *</Label>
                    <Input type="number" min={0} step="0.01" value={form.price_dollars} onChange={(e) => setForm({ ...form, price_dollars: e.target.value })} placeholder="500" />
                  </div>
                  <div>
                    <Label>Total Spots</Label>
                    <Input type="number" min={1} value={form.total_spots} onChange={(e) => setForm({ ...form, total_spots: e.target.value })} placeholder="Leave blank for unlimited" />
                  </div>
                </div>
                <div>
                  <Label>Short Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One-line summary" maxLength={200} />
                </div>
                <div>
                  <Label>What's Included</Label>
                  <Textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="One benefit per line" rows={4} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Inactive packages are hidden on the public page.</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTier ? "Save Changes" : "Create Package"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading packages…
          </div>
        ) : tiers.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No vendor packages yet. Create one to start accepting paid vendor registrations.
          </div>
        ) : (
          <div className="grid gap-3">
            {tiers.map((t) => {
              const remaining = t.total_spots != null ? Math.max(0, t.total_spots - (t.spots_used || 0)) : null;
              const soldOut = remaining === 0;
              return (
                <div key={t.id} className="flex items-start justify-between gap-4 border rounded-lg p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{t.name}</h4>
                      <span className="font-mono text-sm text-primary">{fmt(t.price_cents)}</span>
                      {!t.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {t.total_spots != null && (
                        <Badge variant={soldOut ? "destructive" : "outline"}>
                          {soldOut ? "Sold Out" : `${remaining} of ${t.total_spots} left`}
                        </Badge>
                      )}
                      {t.total_spots == null && <Badge variant="outline">Unlimited</Badge>}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                    {t.benefits && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">{t.benefits}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(t)} title={t.is_active ? "Deactivate" : "Activate"}>
                      {t.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this package?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Existing vendor registrations linked to this package will keep their data, but will no longer reference an active tier.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(t.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorTiersManager;
