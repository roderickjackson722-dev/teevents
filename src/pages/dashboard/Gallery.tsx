import { useState, useRef } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Gallery() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("id, title").eq("organization_id", org!.orgId).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: photos, isLoading } = useQuery({
    queryKey: ["tournament-photos", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_photos").select("*").eq("tournament_id", selectedTournament).order("sort_order");
      return data || [];
    },
    enabled: !!selectedTournament,
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedTournament || demoGuard()) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `gallery/${selectedTournament}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("tournament-assets").upload(path, file);
      if (uploadError) {
        toast({ title: "Upload error", description: uploadError.message, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("tournament-assets").getPublicUrl(path);
      await supabase.from("tournament_photos").insert({
        tournament_id: selectedTournament,
        image_url: urlData.publicUrl,
        caption: file.name.replace(/\.[^/.]+$/, ""),
      });
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["tournament-photos"] });
    toast({ title: `${files.length} photo(s) uploaded!` });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-photos"] });
      toast({ title: "Photo removed" });
    },
  });

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Photo Gallery</h1>
          <p className="text-muted-foreground">Upload and manage tournament photos.</p>
        </div>
        {selectedTournament && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Photos"}
            </Button>
          </>
        )}
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : photos && photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={photo.image_url} alt={photo.caption || ""} className="w-full aspect-square object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(photo.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {photo.caption && (
                <p className="p-2 text-xs text-muted-foreground truncate">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      ) : selectedTournament ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <ImagePlus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No photos yet. Upload some to get started.</p>
        </div>
      ) : null}
    </div>
  );
}
