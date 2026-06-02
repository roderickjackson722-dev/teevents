import { useEffect, useState } from "react";
import { X } from "lucide-react";
import logoAsset from "@/assets/teevents-logo-final.png.asset.json";

interface BrandingBadgeProps {
  /** When false (and organizer is on Pro/Enterprise), the badge is permanently hidden. */
  show?: boolean | null;
}

const STORAGE_KEY = "teeventsBadgeClosed";

/**
 * Small "Powered by TeeVents" badge shown on public-facing pages.
 * Users can dismiss it for the current browser session via the close button.
 */
export function BrandingBadge({ show = true }: BrandingBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show === false) {
      setVisible(false);
      return;
    }
    const closed = typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "true";
    setVisible(!closed);
  }, [show]);

  if (!visible) return null;

  const handleClose = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setVisible(false);
  };

  return (
    <a
      href="https://www.teevents.golf/?ref=branding-badge"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[1000] flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs shadow-lg ring-1 ring-black/10 backdrop-blur transition-opacity hover:opacity-95"
      style={{ textDecoration: "none" }}
    >
      <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
        Powered by
      </span>
      <img
        src={logoAsset.url}
        alt="TeeVents"
        className="h-6 sm:h-7 w-auto object-contain"
        loading="lazy"
      />
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
        aria-label="Hide badge"
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </a>
  );
}

export default BrandingBadge;
