import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

interface Photo {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number | null;
}

interface Props {
  tournamentId: string;
  orgId: string | null | undefined;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function PhotoGalleryManager({ tournamentId, orgId }: Props) {
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [editCaption, setEditCaption] = useState("");

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tournament_photos")
      .select("id, image_url, caption, sort_order")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load photos", description: error.message, variant: "destructive" });
    } else {
      setPhotos((data as Photo[]) || []);
    }
    setLoading(false);
  }, [tournamentId, toast]);

  useEffect(() => {
    if (tournamentId) fetchPhotos();
  }, [tournamentId, fetchPhotos]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !orgId) return;
    if (demoGuard()) return;
    setUploading(true);
    let success = 0;
    let baseOrder = photos.length;
    for (const file of Array.from(files)) {
      if (!ALLOWED.includes(file.type)) {
        toast({ title: "Unsupported file", description: `${file.name} must be JPG, PNG, or WEBP.`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB.`, variant: "destructive" });
        continue;
      }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${orgId}/${tournamentId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tournament-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      const { error: insErr } = await supabase.from("tournament_photos").insert({
        tournament_id: tournamentId,
        image_url: urlData.publicUrl,
        caption: null,
        sort_order: baseOrder++,
      });
      if (insErr) {
        toast({ title: "Save failed", description: insErr.message, variant: "destructive" });
      } else {
        success++;
      }
    }
    setUploading(false);
    if (success > 0) {
      toast({ title: `${success} photo${success > 1 ? "s" : ""} uploaded` });
      fetchPhotos();
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = Array.from(photos);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setPhotos(next);
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    if (demoGuard()) return;
    setSavingOrder(true);
    const updates = photos.map((p, idx) =>
      supabase.from("tournament_photos").update({ sort_order: idx }).eq("id", p.id),
    );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error);
    setSavingOrder(false);
    if (err?.error) {
      toast({ title: "Couldn't save order", description: err.error.message, variant: "destructive" });
      return;
    }
    setOrderDirty(false);
    toast({ title: "Order saved" });
  };

  const handleDelete = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("tournament_photos").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Photo removed" });
  };

  const startEdit = (p: Photo) => {
    setEditing(p);
    setEditCaption(p.caption || "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_photos")
      .update({ caption: editCaption.trim() || null })
      .eq("id", editing.id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === editing.id ? { ...p, caption: editCaption.trim() || null } : p)),
    );
    setEditing(null);
    toast({ title: "Caption updated" });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Label className="text-base font-bold">Photo Gallery</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add photos to your public tournament page (course views, past events, team photos, sponsor banners). Drag to reorder.
            The Gallery tab on your public page appears automatically once you upload at least one photo.
          </p>
        </div>
        <label className="cursor-pointer shrink-0">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload Photos"}
          </span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-md">
          <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          No photos yet. Upload JPG, PNG, or WEBP images (max 10MB each).
        </div>
      ) : (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="gallery-photos">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {photos.map((photo, idx) => (
                    <Draggable key={photo.id} draggableId={photo.id} index={idx}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={`flex items-center gap-3 p-2 border rounded-md bg-card ${
                            snapshot.isDragging ? "border-primary shadow-md" : "border-border"
                          }`}
                        >
                          <button
                            type="button"
                            {...prov.dragHandleProps}
                            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="h-5 w-5" />
                          </button>
                          <img
                            src={photo.image_url}
                            alt={photo.caption || "Gallery photo"}
                            className="h-14 w-14 rounded object-cover border border-border shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {photo.caption || "Untitled photo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Position {idx + 1}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(photo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(photo.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {orderDirty && (
            <div className="flex justify-end">
              <Button onClick={saveOrder} disabled={savingOrder} size="sm">
                {savingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Order
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <img
                src={editing.image_url}
                alt={editing.caption || ""}
                className="w-full max-h-64 object-contain rounded border border-border bg-muted"
              />
              <div>
                <Label htmlFor="photo-caption">Caption (optional)</Label>
                <Input
                  id="photo-caption"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="e.g. View of hole 18"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use drag-and-drop in the gallery list to change position.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
