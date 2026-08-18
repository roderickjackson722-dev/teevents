import { useEffect, useRef, useState } from "react";
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
import { Trash2, Pencil, Plus, Play, Upload, Image as ImageIcon, Wand2 } from "lucide-react";
import { TabTitleInput } from "@/components/dashboard/TabTitleInput";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";

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

interface Tournament { id: string; title: string; organization_id?: string }

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

// Try to derive a thumbnail from a YouTube or Vimeo URL
function deriveThumbFromUrl(url: string): string | null {
  if (!url) return null;
  // YouTube watch?v= or youtu.be
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
}

// Capture a frame from an .mp4 / direct video URL
async function captureFrameFromVideo(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = videoUrl;
    v.addEventListener("loadeddata", () => {
      try { v.currentTime = Math.min(1, (v.duration || 1) / 2); } catch { /* ignore */ }
    });
    v.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 640;
        canvas.height = v.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
      } catch {
        resolve(null);
      }
    });
    v.addEventListener("error", () => resolve(null));
    // Safety timeout
    setTimeout(() => resolve(null), 8000);
  });
}

function toEmbedUrl(url: string): { type: "iframe" | "video" | "unknown"; src: string } {
  if (!url) return { type: "unknown", src: "" };
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) return { type: "video", src: url };
  return { type: "unknown", src: url };
}

export default function MediaClipsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Clip> | null>(null);
  const [previewing, setPreviewing] = useState<Clip | null>(null);
  const [uploading, setUploading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: orgs } = await supabase.from("org_members").select("organization_id").eq("user_id", user.id);
      const orgIds = (orgs || []).map((o: any) => o.organization_id);
      const { data: ts } = await supabase.from("tournaments").select("id, title, organization_id").in("organization_id", orgIds).order("date", { ascending: false });
      setTournaments((ts as any) || []);
      if (ts && ts.length) {
        const pickedId = pickTournamentId(ts as any);
        const picked = (ts as any[]).find((t) => t.id === pickedId) || (ts as any[])[0];
        setTournamentId(picked.id);
        setOrgId(picked.organization_id);
      }
    })();
  }, []);

  useEffect(() => {
    if (!tournamentId) return;
    const t = tournaments.find((x) => x.id === tournamentId);
    if (t?.organization_id) setOrgId(t.organization_id);
    refresh();
  }, [tournamentId]);

  const refresh = async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data } = await (supabase as any).from("media_clips").select("*").eq("tournament_id", tournamentId).order("display_order");
    setClips((data as Clip[]) || []);
    setLoading(false);
  };

  const uploadThumbnail = async (file: File) => {
    if (!orgId || !tournamentId) {
      toast({ title: "Select a tournament first", variant: "destructive" });
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Use JPG, PNG, or WEBP", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large (max 10MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${orgId}/${tournamentId}/media-thumbs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("tournament-assets").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
    setEditing((prev) => prev ? { ...prev, thumbnail_url: urlData.publicUrl } : prev);
    toast({ title: "Thumbnail uploaded" });
  };

  const autoCaptureThumbnail = async () => {
    if (!editing?.video_url) {
      toast({ title: "Enter a video URL first", variant: "destructive" });
      return;
    }
    setCapturing(true);
    // 1) Try YouTube/Vimeo derived thumbnail first
    const derived = deriveThumbFromUrl(editing.video_url);
    if (derived) {
      setEditing({ ...editing, thumbnail_url: derived });
      setCapturing(false);
      toast({ title: "Thumbnail set from video" });
      return;
    }
    // 2) Try capturing a frame from a direct video URL
    try {
      const blob = await captureFrameFromVideo(editing.video_url);
      if (!blob) {
        toast({ title: "Couldn't auto-capture", description: "Upload a thumbnail image instead.", variant: "destructive" });
        setCapturing(false);
        return;
      }
      const file = new File([blob], `frame-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadThumbnail(file);
    } catch (e: any) {
      toast({ title: "Capture failed", description: e?.message, variant: "destructive" });
    }
    setCapturing(false);
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
      thumbnail_url: editing.thumbnail_url ?? deriveThumbFromUrl(editing.video_url),
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
                    <Button size="icon" variant="ghost" onClick={() => setPreviewing(c)} title="Preview"><Play className="w-4 h-4" /></Button>
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
        <DialogContent className="max-w-lg">
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

              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <Label>Display thumbnail</Label>
                <p className="text-xs text-muted-foreground">
                  Shown on your public page before the visitor clicks play. Use the auto button for YouTube/Vimeo links or for direct video files, or upload your own image.
                </p>
                {editing.thumbnail_url ? (
                  <div className="relative aspect-video w-full bg-background rounded overflow-hidden border">
                    <img src={editing.thumbnail_url} alt="thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-background rounded border flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={autoCaptureThumbnail} disabled={capturing || !editing.video_url}>
                    <Wand2 className="w-4 h-4 mr-1" /> {capturing ? "Capturing…" : "Auto from video"}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f); e.currentTarget.value = ""; }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading…" : "Upload image"}
                  </Button>
                  {editing.thumbnail_url && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing({ ...editing, thumbnail_url: null })}>Remove</Button>
                  )}
                </div>
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Or paste an image URL</summary>
                  <Input className="mt-1" value={editing.thumbnail_url || ""} onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })} placeholder="https://..." />
                </details>
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
            {editing?.video_url && (
              <Button variant="secondary" onClick={() => setPreviewing({ ...(editing as Clip) })}>
                <Play className="w-4 h-4 mr-1" /> Preview
              </Button>
            )}
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewing?.title || "Preview"}</DialogTitle></DialogHeader>
          {previewing && (() => {
            const { type, src } = toEmbedUrl(previewing.video_url);
            if (type === "iframe") {
              return (
                <div className="aspect-video w-full bg-black rounded overflow-hidden">
                  <iframe src={src} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                </div>
              );
            }
            if (type === "video") {
              return (
                <div className="aspect-video w-full bg-black rounded overflow-hidden">
                  <video src={src} controls autoPlay className="w-full h-full" />
                </div>
              );
            }
            return (
              <div className="p-4 text-sm">
                Unable to embed this URL. <a href={src} target="_blank" rel="noreferrer" className="underline">Open in new tab</a>.
              </div>
            );
          })()}
          {previewing?.description && <p className="text-sm text-muted-foreground">{previewing.description}</p>}
        </DialogContent>
      </Dialog>
    </div>

  );
}
