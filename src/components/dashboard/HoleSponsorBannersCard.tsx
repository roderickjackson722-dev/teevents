import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Row {
  id: string;
  name: string;
  logo_url: string | null;
  hole_banner_enabled: boolean;
  hole_banner_display: string;
  hole_banner_name: string | null;
  hole_banner_logo_url: string | null;
  hole_banner_placement: string;
  hole_banner_scope: string;
  hole_banner_holes: number[];
}

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

/** Per-sponsor "This hole is sponsored by" banner settings for player scoring screens. Display settings only. */
export default function HoleSponsorBannersCard({ tournamentId, orgId }: { tournamentId: string; orgId: string }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    setLoading(true);
    supabase
      .from("tournament_sponsors")
      .select("id, name, logo_url, hole_banner_enabled, hole_banner_display, hole_banner_name, hole_banner_logo_url, hole_banner_placement, hole_banner_scope, hole_banner_holes")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setRows(((data as any[]) || []) as Row[]);
        setLoading(false);
      });
  }, [tournamentId]);

  const patch = (id: string, p: Partial<Row>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const upload = async (id: string, file: File) => {
    setUploadingId(id);
    const ext = file.name.split(".").pop();
    const path = `${orgId}/${tournamentId}/sponsors/hole-banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: true });
    setUploadingId(null);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    patch(id, { hole_banner_logo_url: supabase.storage.from("tournament-assets").getPublicUrl(path).data.publicUrl });
  };

  const save = async () => {
    setSaving(true);
    const results = await Promise.all(rows.map((r) =>
      supabase.from("tournament_sponsors").update({
        hole_banner_enabled: r.hole_banner_enabled,
        hole_banner_display: r.hole_banner_display,
        hole_banner_name: r.hole_banner_name?.trim() || null,
        hole_banner_logo_url: r.hole_banner_logo_url || null,
        hole_banner_placement: r.hole_banner_placement,
        hole_banner_scope: r.hole_banner_scope,
        hole_banner_holes: r.hole_banner_scope === "all" ? [] : r.hole_banner_holes,
      } as any).eq("id", r.id),
    ));
    setSaving(false);
    const err = results.find((x) => x.error)?.error;
    if (err) toast({ title: "Save failed", description: err.message, variant: "destructive" });
    else toast({ title: "Hole sponsor banners saved" });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Hole Sponsor Banners (Player Scoring Screen)</CardTitle>
        <CardDescription>
          Shows "This hole is sponsored by" above or below the player's score entry. Sponsors left off keep today's display.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsors added yet.</p>
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={r.hole_banner_enabled} onCheckedChange={(v) => patch(r.id, { hole_banner_enabled: !!v })} />
                  <span className="text-sm font-semibold">{r.name}</span>
                  <span className="text-xs text-muted-foreground">Show hole banner</span>
                </label>
                {r.hole_banner_enabled && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Sponsor name</Label>
                      <Input value={r.hole_banner_name ?? ""} placeholder={r.name} onChange={(e) => patch(r.id, { hole_banner_name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Logo</Label>
                      <div className="flex items-center gap-2">
                        {(r.hole_banner_logo_url || r.logo_url) && (
                          <img src={(r.hole_banner_logo_url || r.logo_url)!} alt="" className="h-9 w-auto max-w-[100px] object-contain border rounded bg-card" />
                        )}
                        <Button type="button" variant="outline" size="sm" asChild disabled={uploadingId === r.id}>
                          <label className="cursor-pointer">
                            {uploadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1" /> Upload Logo</>}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r.id, f); e.target.value = ""; }} />
                          </label>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Show</Label>
                      <Select value={r.hole_banner_display} onValueChange={(v) => patch(r.id, { hole_banner_display: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="logo">Logo only</SelectItem>
                          <SelectItem value="name">Sponsor name only</SelectItem>
                          <SelectItem value="both">Logo and name</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Placement</Label>
                      <Select value={r.hole_banner_placement} onValueChange={(v) => patch(r.id, { hole_banner_placement: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top of screen</SelectItem>
                          <SelectItem value="bottom">Bottom of screen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Holes</Label>
                      <Select value={r.hole_banner_scope} onValueChange={(v) => patch(r.id, { hole_banner_scope: v, hole_banner_holes: v === "per_hole" ? r.hole_banner_holes.slice(0, 1) : r.hole_banner_holes })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_hole">Per hole (one hole)</SelectItem>
                          <SelectItem value="all">All 18 holes</SelectItem>
                          <SelectItem value="holes">Specific holes</SelectItem>
                        </SelectContent>
                      </Select>
                      {r.hole_banner_scope !== "all" && (
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 mt-2">
                          {HOLES.map((h) => {
                            const on = r.hole_banner_holes.includes(h);
                            return (
                              <Button
                                key={h}
                                type="button"
                                size="sm"
                                variant={on ? "secondary" : "outline"}
                                className={on ? "ring-2 ring-primary" : ""}
                                onClick={() => patch(r.id, {
                                  hole_banner_holes: r.hole_banner_scope === "per_hole"
                                    ? [h]
                                    : on ? r.hole_banner_holes.filter((x) => x !== h) : [...r.hole_banner_holes, h].sort((a, b) => a - b),
                                })}
                              >
                                {h}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Hole Banners"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
