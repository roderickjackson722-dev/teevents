import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Removes the background from an already-uploaded logo in the browser,
 * stores the transparent PNG next to it, and hands back the new public URL.
 * The caller decides what to do with the URL (usually set the same field).
 */
export default function RemoveLogoBackgroundButton({
  imageUrl,
  folder,
  onDone,
  bucket = "tournament-assets",
  className = "",
}: {
  imageUrl: string | null | undefined;
  /** Storage folder (no trailing slash) for the processed PNG. */
  folder: string;
  onDone: (url: string) => void;
  bucket?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!imageUrl) return null;

  const run = async () => {
    setBusy(true);
    try {
      toast({ title: "Removing background…", description: "The first run can take about 10 seconds." });
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(imageUrl);
      const path = `${folder}/logo-nobg-${Date.now()}.png`;
      const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "image/png" });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onDone(data.publicUrl);
      toast({ title: "Background removed", description: "Save your changes to apply." });
    } catch (e: any) {
      toast({
        title: "Couldn't remove background",
        description: e?.message || "Try a different image, or upload a transparent PNG.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
      {busy ? "Removing background…" : "Remove background"}
    </button>
  );
}
