import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus, Play } from "lucide-react";
import { TabTitleInput } from "@/components/dashboard/TabTitleInput";

interface Clip {
  id: string;
  tournament_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface Tournament { id: string; title: string }

export default function MediaClipsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Clip> | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      const { data: ts } = await supabase.from("tournaments").select("id, title").in("organization_id", orgIds).order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts && ts.length) setTournamentId(ts[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    refresh();
  }, [tournamentId]);

  const refresh = async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data } = await (supabase as any).from("media_clips").select("*").eq("tournament_id", tournamentId).order("display_order");
    setClips((data as Clip[]) || []);
    setLoading(false);
  };

  const save = async () => {
    if (!editing || !tournamentId) return;
    if (!editing.title || !editing.video_url) {
      toast({ title: "Title and video URL required", variant: "destructive" });
      return;
    }
    const payload: any = {
      tournament_id: tournamentId,
      title: editing.title,
      description: editing.description ?? null,
      video_url: editing.video_url,
      thumbnail_url: editing.thumbnail_url ?? null,
      display_order: editing.display_order ?? clips.length,
      is_active: editing.is_active ?? true,
    };
    let error;
    if (editing.id) {
      ({ error } = await (supabase as any).from("media_clips").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("media_clips").insert(payload));
    }
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Saved" });
      setEditing(null);
      refresh();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this clip?")) return;
    const { error } = await (supabase as any).from("media_clips").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Media Clips</h1>
        <p className="text-muted-foreground text-sm">Add video clips and highlights that appear on your public tournament page.</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Tournament</Label>
          <Select value={tournamentId ?? undefined} onValueChange={setTournamentId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {tournamentId && (
          <TabTitleInput tournamentId={tournamentId} field="media_tab_title" defaultValue="Media" label="Public tab title" />
        )}
        <Button onClick={() => setEditing({ is_active: true, display_order: clips.length })} disabled={!tournamentId}>
          <Plus className="w-4 h-4 mr-1" /> Add Clip
        </Button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : clips.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No media clips yet.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Play className="w-10 h-10" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.video_url}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                {!c.is_active && <span className="text-xs px-2 py-0.5 rounded bg-muted">Hidden</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Clip" : "Add Clip"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Video URL (YouTube, Vimeo, or .mp4)</Label>
                <Input value={editing.video_url || ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div>
                <Label>Thumbnail URL (optional)</Label>
                <Input value={editing.thumbnail_url || ""} onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Show on public page</Label>
              </div>
              <div>
                <Label>Display order</Label>
                <Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
