import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  className?: string;
  /** Show the dashed placeholder when there is no logo at all (not just on error) */
  placeholderWhenMissing?: boolean;
  label?: string;
}

/**
 * Logo for on-screen printable previews. Falls back to a clearly visible
 * placeholder when the selected printable logo fails to load, so organizers
 * never see a silently blank header.
 */
export default function PrintLogo({ src, className, placeholderWhenMissing = false, label = "Logo unavailable" }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    if (!src && !placeholderWhenMissing) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-dashed border-muted-foreground/50 px-1.5 py-1 text-[9px] uppercase tracking-wider text-muted-foreground",
          className,
        )}
        title={src ? `Could not load ${src}` : "No printable logo selected"}
      >
        <ImageOff className="h-3 w-3 shrink-0" />
        {src ? label : "No logo"}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  );
}
