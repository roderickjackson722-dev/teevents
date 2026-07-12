import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, LayoutTemplate } from "lucide-react";
import { PublicTabsManager } from "@/components/site-builder/PublicTabsManager";

export default function WebpageLayout() {
  const { org, loading: orgLoading } = useOrgContext();
  const [tournamentId, setTournamentId] = useTournamentIdParam();
  const [selected, setSelected] = useState(tournamentId);

  useEffect(() => {
    if (tournamentId && tournamentId !== selected) setSelected(tournamentId);
  }, [tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
    queryKey: ["webpage-layout-tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  // Auto-pick most recent tournament
  useEffect(() => {
    if (!selected && tournaments && tournaments.length > 0) {
      setSelected(tournaments[0].id);
      setTournamentId(tournaments[0].id);
    }
  }, [tournaments, selected, setTournamentId]);

  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ["webpage-layout-tournament", selected],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, public_tabs, public_tabs_order, golfers_register_first")
        .eq("id", selected)
        .maybeSingle();
      return data;
    },
    enabled: !!selected,
  });

  if (orgLoading || tournamentsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-emerald-100 text-emerald-700">
          <LayoutTemplate className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Webpage Layout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which sections appear on your public tournament webpage and drag to reorder them.
            The order here controls both the top navigation tabs and the order they appear on the page.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <Label className="text-sm font-semibold mb-2 block">Tournament</Label>
        {tournaments && tournaments.length > 0 ? (
          <Select
            value={selected}
            onValueChange={(v) => {
              setSelected(v);
              setTournamentId(v);
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select a tournament" /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Create a tournament first to configure its webpage layout.
          </p>
        )}
      </div>

      {selected && tournamentLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {selected && tournament && (
        <PublicTabsManager
          tournamentId={tournament.id}
          initialVisibility={(tournament as any).public_tabs}
          initialOrder={(tournament as any).public_tabs_order}
          initialGolfersFirst={(tournament as any).golfers_register_first}
        />
      )}
    </div>
  );
}
