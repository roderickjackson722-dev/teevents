import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { setTournamentDefaultSlug } from "@/lib/adminSlug.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

interface Props {
  tournamentId: string;
  currentSlug: string | null;
  onSaved: (slug: string) => void;
}

/**
 * Platform-admin-only control to rewrite the default /t/<slug> URL.
 * Renders nothing for organizers.
 */
export default function AdminDefaultSlugEditor({ tournamentId, currentSlug, onSaved }: Props) {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [draft, setDraft] = useState(currentSlug || "");
  const [saving, setSaving] = useState(false);
  const saveSlug = useServerFn(setTournamentDefaultSlug);

  useEffect(() => {
    setDraft(currentSlug || "");
  }, [currentSlug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!cancelled) setIsAdmin(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin || !tournamentId) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveSlug({ data: { tournamentId, slug: draft } });
      onSaved(res.slug);
      setDraft(res.slug);
      toast({ title: "Default URL updated", description: `/t/${res.slug}` });
    } catch (err: any) {
      toast({
        title: "Could not update URL",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-primary/40 bg-primary/5 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">TeeVents Admin — Edit Default URL</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Only visible to TeeVents administrators. Changing this replaces the default link, so
        previously shared links using the old address will stop working.
      </p>
      <div className="flex items-stretch rounded-md border border-input overflow-hidden bg-background">
        <span className="inline-flex items-center px-3 text-xs text-muted-foreground bg-muted/50 border-r border-input font-mono">
          teevents.golf/t/
        </span>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="spring-classic-2026"
          className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
          maxLength={80}
          disabled={saving}
        />
      </div>
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !draft.trim() || draft.trim() === (currentSlug || "")}
      >
        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        Save Default URL
      </Button>
    </div>
  );
}
