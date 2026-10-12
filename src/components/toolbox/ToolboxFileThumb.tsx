import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { signedUrl, type ToolboxFile } from "@/lib/organizerToolbox";

export default function ToolboxFileThumb({ file, size = "h-20 w-20" }: { file: ToolboxFile; size?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { signedUrl(file.path).then(setUrl); }, [file.path]);
  const isImage = (file.type || "").startsWith("image/") || /\.(png|jpe?g|svg|webp)$/i.test(file.name);
  if (isImage) {
    return <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" className={`${size} flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted`}>
      {url ? <img src={url} alt={file.label || file.name} className="max-h-full max-w-full object-contain" /> : null}
    </a>;
  }
  return <a href={url ?? undefined} target="_blank" rel="noopener noreferrer" download={file.name} className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:underline">
    <FileText className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span>
  </a>;
}
