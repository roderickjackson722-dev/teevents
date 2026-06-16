import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";

type TP = { pain: string; solution: string };
type Comp = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  talking_points: TP[];
  is_active: boolean;
  sort_order: number;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

export default function AdminCompetitors() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Comp[]>([]);
  const [editing, setEditing] = useState<Comp | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase.from("admin_competitors").select("*").order("sort_order").order("name");
    setRows((data || []) as any);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin-login"); return; }
      const { data: role } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!role);
      if (role) await load();
      setLoading(false);
    })();
  }, [navigate]);

  function newRow() {
    setEditing({ id: "", name: "", slug: "", description: "", talking_points: [{ pain: "", solution: "" }], is_active: true, sort_order: 50 });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    const payload = {
      name: editing.name.trim(),
      slug: editing.slug.trim() || slugify(editing.name),
      description: editing.description || null,
      talking_points: editing.talking_points.filter(tp => tp.pain.trim() || tp.solution.trim()),
      is_active: editing.is_active,
      sort_order: editing.sort_order,
    };
    if (!payload.name || !payload.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    const res = editing.id
      ? await supabase.from("admin_competitors").update(payload).eq("id", editing.id)
      : await supabase.from("admin_competitors").insert(payload);
    if (res.error) { toast({ title: "Save failed", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    setOpen(false); setEditing(null); await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this competitor?")) return;
    const { error } = await supabase.from("admin_competitors").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    await load();
  }

  if (loading) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <div className="p-8">Admin access required.</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Admin
          </Button>
          <h1 className="text-xl font-semibold">Competitor Library</h1>
          <div className="ml-auto">
            <Button onClick={newRow} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">
              <Plus className="h-4 w-4 mr-1" /> Add Competitor
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        {rows.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {c.name}
                <Badge variant="outline">{c.slug}</Badge>
                {!c.is_active && <Badge variant="secondary">inactive</Badge>}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing({ ...c, talking_points: c.talking_points?.length ? c.talking_points : [{ pain: "", solution: "" }] }); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{(c.talking_points || []).length} talking points</div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground">No competitors yet.</div>}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Competitor" : "Add Competitor"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Talking Points (pain → solution)</Label>
                <div className="space-y-2">
                  {editing.talking_points.map((tp, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                      <Input placeholder="Pain point" value={tp.pain} onChange={(e) => {
                        const next = [...editing.talking_points]; next[i] = { ...next[i], pain: e.target.value };
                        setEditing({ ...editing, talking_points: next });
                      }} />
                      <Input placeholder="Solution" value={tp.solution} onChange={(e) => {
                        const next = [...editing.talking_points]; next[i] = { ...next[i], solution: e.target.value };
                        setEditing({ ...editing, talking_points: next });
                      }} />
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditing({ ...editing, talking_points: editing.talking_points.filter((_, j) => j !== i) });
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing, talking_points: [...editing.talking_points, { pain: "", solution: "" }] })}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <label className="flex items-end gap-2 pb-2">
                  <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                  <span>Active</span>
                </label>
              </div>
              </div>

              {/* Live Preview */}
              <div className="border-l md:pl-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live Preview</Label>
                  <Badge variant="outline">{editing.name || "Unnamed"}</Badge>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-bold mb-1">{editing.name || "Competitor"}</h3>
                  {editing.description && (
                    <p className="text-xs text-muted-foreground mb-3">{editing.description}</p>
                  )}
                  <div className="space-y-2">
                    {editing.talking_points.filter(tp => tp.pain.trim() || tp.solution.trim()).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Add a pain point and solution to preview.</p>
                    )}
                    {editing.talking_points.filter(tp => tp.pain.trim() || tp.solution.trim()).map((tp, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-2 text-xs">
                        <div>
                          <div className="font-semibold text-destructive mb-0.5">Pain</div>
                          <div>{tp.pain || <span className="text-muted-foreground italic">—</span>}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-[#1a5c38] mb-0.5">Solution</div>
                          <div>{tp.solution || <span className="text-muted-foreground italic">—</span>}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This is how talking points will appear in Demo Preparation when the prospect's platform is set to <code className="bg-muted px-1 rounded">{editing.slug || "—"}</code>.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={save} className="bg-[#F5A623] text-[#1a5c38] hover:bg-[#F5A623]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
