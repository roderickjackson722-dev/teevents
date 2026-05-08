import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { US_STATES } from "@/lib/usStates";

interface TournamentRow {
  id: string;
  title: string;
  show_in_public_search: boolean;
  state: string | null;
}

const PublicSearch = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    supabase
      .from("tournaments")
      .select("id, title, show_in_public_search, state")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTournaments((data as any) || []);
        setLoading(false);
      });
  }, [org]);

  const updateRow = (id: string, patch: Partial<TournamentRow>) => {
    setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleToggle = async (t: TournamentRow, value: boolean) => {
    setSavingId(t.id);
    updateRow(t.id, { show_in_public_search: value });
    const { error } = await supabase
      .from("tournaments")
      .update({ show_in_public_search: value } as any)
      .eq("id", t.id);
    if (error) {
      toast.error(error.message);
      updateRow(t.id, { show_in_public_search: !value });
    } else {
      toast.success(value ? "Listed on public search" : "Removed from public search");
    }
    setSavingId(null);
  };

  const handleStateChange = async (t: TournamentRow, value: string) => {
    const next = value || null;
    setSavingId(t.id);
    updateRow(t.id, { state: next });
    const { error } = await supabase
      .from("tournaments")
      .update({ state: next } as any)
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success("State saved");
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-display font-bold text-foreground">Public Search</h1>
        <p className="text-muted-foreground mt-1">
          Choose which of your tournaments appear in the TeeVents public directory at{" "}
          <span className="font-mono text-xs">teevents.golf/tournaments/search</span>.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <SearchIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            You don't have any tournaments yet. Create one first to manage public search visibility.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border p-6 space-y-4"
        >
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-lg border border-border space-y-4"
            >
              <p className="font-semibold text-foreground">{t.title}</p>

              <div className="flex items-start gap-3">
                <Switch
                  checked={!!t.show_in_public_search}
                  onCheckedChange={(v) => handleToggle(t, v)}
                  disabled={savingId === t.id}
                />
                <div className="flex-1">
                  <Label className="text-sm font-semibold">
                    Show on public tournament search
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lists this event publicly so golfers can find and register.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  State {t.show_in_public_search && <span className="text-destructive">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required so golfers can filter your tournament by location.
                </p>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={t.state || ""}
                  onChange={(e) => handleStateChange(t, e.target.value)}
                  disabled={savingId === t.id}
                >
                  <option value="">Select a state…</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                {t.show_in_public_search && !t.state && (
                  <p className="text-xs text-amber-700 flex items-center gap-1.5 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Add a state so golfers can find your event by location.
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default PublicSearch;
