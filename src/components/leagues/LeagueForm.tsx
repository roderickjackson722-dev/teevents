import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  initial?: any;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function LeagueForm({ onClose, onSaved, initial }: Props) {
  const { org } = useOrgContext();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    league_name: initial?.league_name || "",
    league_slug: initial?.league_slug || "",
    description: initial?.description || "",
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    season_year: initial?.season_year || new Date().getFullYear(),
    is_public: initial?.is_public ?? true,
    is_active: initial?.is_active ?? true,
  });

  const save = async () => {
    if (!org) return;
    if (!form.league_name.trim()) {
      toast({ title: "League name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = form.league_slug.trim() || `${slugify(form.league_name)}-${Date.now().toString(36).slice(-4)}`;
    const payload = {
      ...form,
      league_slug: slug,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      season_year: form.season_year ? Number(form.season_year) : null,
      organization_id: org.orgId,
    };
    const query = initial
      ? (supabase as any).from("golf_leagues").update(payload).eq("id", initial.id)
      : (supabase as any).from("golf_leagues").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: initial ? "League updated" : "League created" });
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit League" : "Create Golf League"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>League Name *</Label>
            <Input value={form.league_name} onChange={(e) => setForm({ ...form, league_name: e.target.value })} />
          </div>
          <div>
            <Label>URL Slug</Label>
            <Input
              value={form.league_slug}
              placeholder={slugify(form.league_name) || "auto-generated"}
              onChange={(e) => setForm({ ...form, league_slug: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Season Year</Label>
              <Input
                type="number"
                value={form.season_year}
                onChange={(e) => setForm({ ...form, season_year: e.target.value as any })}
              />
            </div>
            <div />
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <div className="font-medium text-sm">Public league</div>
              <div className="text-xs text-muted-foreground">Visible on public listings</div>
            </div>
            <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <div className="font-medium text-sm">Active</div>
              <div className="text-xs text-muted-foreground">Accepting members and running events</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Save changes" : "Create League"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
