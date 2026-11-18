import { useId, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Admin-only image upload to the existing public event-images bucket; returns the public URL. */
export default function ImageUploadButton({ onUploaded, label = "Upload photo" }: { onUploaded: (url: string) => void; label?: string }) {
  const id = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function upload(file: File) {
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Use an image under 8 MB."); return; }
    setBusy(true); setError("");
    try {
      const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
      const path = `proposals/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("event-images").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      onUploaded(supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); } finally { setBusy(false); }
  }
  return <div className="space-y-1">
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"><Upload className="size-4" aria-hidden="true" />{busy ? "Uploading…" : label}</label>
    <input id={id} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
