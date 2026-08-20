import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminSetBrandingOverride } from "@/lib/brandingRemoval.functions";

interface Row {
  id: string;
  title: string;
  is_pro: boolean | null;
  show_branding_footer: boolean;
  branding_footer_admin_override: boolean;
  branding_footer_admin_show: boolean;
  branding_footer_custom_text: string | null;
  branding_removed: boolean | null;
  branding_removed_by_admin: boolean | null;
  branding_override_reason: string | null;
}

export default function AdminBrandingFooter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, is_pro, show_branding_footer, branding_footer_admin_override, branding_footer_admin_show, branding_footer_custom_text, branding_removed, branding_removed_by_admin, branding_override_reason")
      .order("created_at", { ascending: false })
      .limit(500) as any;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (row: Row) => {
    setSaving(row.id);
    const { error } = await supabase
      .from("tournaments")
      .update({
        branding_footer_admin_override: row.branding_footer_admin_override,
        branding_footer_admin_show: row.branding_footer_admin_show,
        branding_footer_custom_text: row.branding_footer_custom_text || null,
      } as any)
      .eq("id", row.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
    setSaving(null);
  };

  const saveBrandingOverride = async (row: Row) => {
    setSaving(row.id);
    try {
      await adminSetBrandingOverride({
        data: {
          tournamentId: row.id,
          removed: !!row.branding_removed_by_admin,
          reason: row.branding_override_reason || "",
        },
      });
      toast({ title: "Branding override saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const filtered = rows.filter((r) => r.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to admin
      </Link>
      <h1 className="text-2xl font-display font-bold mb-2">Branding Footer Overrides</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Override per-tournament TeeVents branding footer visibility and text. Overrides take precedence over the organizer's setting.
      </p>
      <Input placeholder="Search tournaments..." value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-4 max-w-sm" />

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Plan: {r.is_pro ? "Pro" : "Free"} · Organizer setting: footer {r.show_branding_footer !== false ? "shown" : "hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Override</Label>
                  <Switch
                    checked={r.branding_footer_admin_override}
                    onCheckedChange={(v) => update(r.id, { branding_footer_admin_override: v })}
                  />
                </div>
              </div>
              {r.branding_footer_admin_override && (
                <div className="space-y-3 pl-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`adm-show-${r.id}`}
                      checked={r.branding_footer_admin_show}
                      onCheckedChange={(v) => update(r.id, { branding_footer_admin_show: v })}
                    />
                    <Label htmlFor={`adm-show-${r.id}`} className="text-sm">
                      {r.branding_footer_admin_show ? "Show footer" : "Hide footer"}
                    </Label>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Custom footer text (optional)</Label>
                    <Input
                      placeholder="Need to run your golf tournament? Get started with TeeVents →"
                      value={r.branding_footer_custom_text || ""}
                      onChange={(e) => update(r.id, { branding_footer_custom_text: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
                <p className="text-sm font-semibold text-foreground">Branding Override (Admin Only)</p>
                <div className="flex items-start gap-2">
                  <Switch
                    id={`brand-remove-${r.id}`}
                    checked={!!r.branding_removed_by_admin}
                    onCheckedChange={(v) => update(r.id, { branding_removed_by_admin: v })}
                  />
                  <Label htmlFor={`brand-remove-${r.id}`} className="text-sm">
                    Remove TeeVents branding for this tournament (no charge)
                  </Label>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <Input
                    placeholder="This tournament was already running before the branding policy was set"
                    value={r.branding_override_reason || ""}
                    onChange={(e) => update(r.id, { branding_override_reason: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Organizer purchase: {r.branding_removed ? "paid — branding removed" : "not purchased"}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => saveBrandingOverride(r)} disabled={saving === r.id}>
                    {saving === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    Save Override
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save(r)} disabled={saving === r.id}>
                  {saving === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Save Override
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No tournaments match.</p>
          )}
        </div>
      )}
    </div>
  );
}
