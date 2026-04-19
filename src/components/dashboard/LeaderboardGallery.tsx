import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, Loader2, Trash2, Upload, Star } from "lucide-react";
import { ImageCropperDialog, fileToDataUrl } from "@/components/ui/image-cropper-dialog";

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  is_hero: boolean;
  sort_order: number;
}

interface Props {
  tournamentId: string;
  orgId: string;
}

export default function LeaderboardGallery({ tournamentId, orgId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!tournamentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("leaderboard_gallery")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data as GalleryItem[]) || []);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!tournamentId || !orgId) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${tournamentId}/leaderboard-gallery/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tournament-assets")
        .upload(path, file, { upsert: true });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      const { error: insErr } = await supabase.from("leaderboard_gallery").insert({
        tournament_id: tournamentId,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        sort_order: items.length,
      });
      if (insErr) {
        toast({ title: "Save failed", description: insErr.message, variant: "destructive" });
      } else {
        toast({ title: "Photo uploaded" });
        setCaption("");
        fetchItems();
      }
      setUploading(false);
    },
    [tournamentId, orgId, caption, items.length, toast, fetchItems]
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leaderboard_gallery").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Photo removed" });
    }
  };

  const setHero = async (id: string) => {
    // Clear all hero flags then set this one
    await supabase
      .from("leaderboard_gallery")
      .update({ is_hero: false })
      .eq("tournament_id", tournamentId);
    const { error } = await supabase
      .from("leaderboard_gallery")
      .update({ is_hero: true })
      .eq("id", id);
    if (!error) {
      toast({ title: "Hero photo updated" });
      fetchItems();
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Leaderboard Gallery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-xs">Caption (optional)</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Hole 5, Team photo, Awards ceremony"
              maxLength={200}
            />
          </div>
          <div className="flex items-end">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setCropSrc(await fileToDataUrl(f));
                  setCropOpen(true);
                }}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors h-10">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload Image
              </span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-md">
            No images yet. Upload tournament photos to display on the live leaderboard.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="relative group rounded-md overflow-hidden border border-border">
                <img src={item.image_url} alt={item.caption || "Gallery photo"} className="w-full h-32 object-cover" />
                {item.is_hero && (
                  <span className="absolute top-1 left-1 bg-secondary text-secondary-foreground text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded">
                    Hero
                  </span>
                )}
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setHero(item.id)} className="h-7 text-xs">
                    <Star className="h-3 w-3 mr-1" /> Set as Hero
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)} className="h-7 text-xs">
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
                {item.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-background/90 px-2 py-1 text-[11px] text-foreground truncate">
                    {item.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ImageCropperDialog
        open={cropOpen}
        onOpenChange={(o) => { setCropOpen(o); if (!o) setCropSrc(null); }}
        imageSrc={cropSrc}
        defaultAspect="free"
        title="Crop Leaderboard Photo"
        onCropped={(file) => handleUpload(file)}
      />
    </Card>
  );
}
