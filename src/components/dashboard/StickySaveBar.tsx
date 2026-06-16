import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSave: () => Promise<void> | void;
  /** Optional label override */
  label?: string;
  /** Disable the button (e.g. when nothing has changed) */
  disabled?: boolean;
}

/**
 * Reusable bottom-right sticky Save button used across the organizer dashboard.
 * Consistent TeeVents green (#1a5c38) with white text.
 */
export default function StickySaveBar({ onSave, label = "Save Changes", disabled = false }: Props) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try {
      await onSave();
      toast({ title: "Changes saved successfully" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || saving}
        className="inline-flex items-center gap-2 rounded-full px-5 py-3 shadow-lg text-white font-semibold transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#1a5c38" }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}
