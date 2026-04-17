import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Check, AlertCircle, Loader2 } from "lucide-react";

const MAX_EDITS = 3;
const DOMAIN = "teevents.golf";

interface Props {
  tournamentId: string;
  currentSlug: string | null; // auto-generated slug (always works)
  customSlug: string | null;
  editCount: number;
  onSaved: (newSlug: string | null, newCount: number) => void;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function CustomSlugEditor({
  tournamentId,
  currentSlug,
  customSlug,
  editCount,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(customSlug || "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editsRemaining = Math.max(0, MAX_EDITS - editCount);
  const canEdit = editsRemaining > 0;
  const cleaned = slugify(draft);
  const unchanged = cleaned === (customSlug || "");

  const checkAvailability = async (val: string) => {
    if (!val || val.length < 3) {
      setAvailable(null);
      setError(val ? "Must be at least 3 characters." : null);
      return;
    }
    setChecking(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from("tournaments")
      .select("id")
      .or(`custom_slug.eq.${val},slug.eq.${val}`)
      .neq("id", tournamentId)
      .limit(1)
      .maybeSingle();
    setChecking(false);
    if (qErr) {
      setError("Couldn't check availability. Try again.");
      setAvailable(null);
      return;
    }
    setAvailable(!data);
    if (data) setError("That URL is already taken.");
  };

  const onChange = (val: string) => {
    setDraft(val);
    const c = slugify(val);
    if (c !== (customSlug || "")) {
      // debounce-lite: defer check by 400ms
      window.clearTimeout((onChange as any)._t);
      (onChange as any)._t = window.setTimeout(() => checkAvailability(c), 400);
    } else {
      setAvailable(null);
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!canEdit || unchanged || available === false) return;
    setSaving(true);
    const newSlug = cleaned || null;
    const { error: uErr } = await supabase
      .from("tournaments")
      .update({
        custom_slug: newSlug,
        url_edit_count: editCount + 1,
        url_edited_at: new Date().toISOString(),
      } as any)
      .eq("id", tournamentId);
    setSaving(false);
    if (uErr) {
      toast({
        title: "Could not save URL",
        description: uErr.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "URL saved",
      description: newSlug
        ? `Your tournament is now at /tournament/${newSlug}`
        : "Custom URL cleared.",
    });
    onSaved(newSlug, editCount + 1);
  };

  const liveUrl = customSlug
    ? `https://${DOMAIN}/tournament/${customSlug}`
    : currentSlug
    ? `https://${DOMAIN}/t/${currentSlug}`
    : null;

  return (
    <div className="border border-border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Custom Tournament URL</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Pick a friendly URL for your tournament page. Both URLs will continue to work — the
        original short URL stays active so any links you've already shared keep working.
      </p>

      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Custom slug
        </Label>
        <div className="mt-1.5 flex items-stretch rounded-md border border-input overflow-hidden bg-background">
          <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted/50 border-r border-input font-mono">
            {DOMAIN}/tournament/
          </span>
          <Input
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            placeholder="spring-classic-2026"
            disabled={!canEdit || saving}
            className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
            maxLength={60}
          />
        </div>
        <div className="mt-1.5 min-h-[1.25rem] text-xs">
          {checking && (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking availability…
            </span>
          )}
          {!checking && error && (
            <span className="text-destructive inline-flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </span>
          )}
          {!checking && !error && available === true && (
            <span className="text-primary inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> Available
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="text-xs text-muted-foreground">
          {canEdit ? (
            <>
              URL can only be changed {MAX_EDITS} times. Edits used:{" "}
              <strong className="text-foreground">
                {editCount}/{MAX_EDITS}
              </strong>
            </>
          ) : (
            <span className="text-destructive font-medium">
              You've reached the {MAX_EDITS}-edit limit. Contact support to change again.
            </span>
          )}
        </p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canEdit || unchanged || saving || available === false || checking}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save URL
        </Button>
      </div>

      {liveUrl && (
        <div className="text-xs text-muted-foreground border-t border-border pt-3">
          <span className="block mb-1">Current public URL:</span>
          <code className="font-mono text-foreground break-all">{liveUrl}</code>
          {customSlug && currentSlug && (
            <span className="block mt-2">
              Original short URL still works:{" "}
              <code className="font-mono text-foreground">
                {DOMAIN}/t/{currentSlug}
              </code>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
