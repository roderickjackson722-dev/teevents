import { useEffect, useState } from "react";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import SetupChecklist from "@/components/SetupChecklist";
import EventTimeline from "@/components/dashboard/EventTimeline";
import UpcomingRemindersWidget from "@/components/dashboard/UpcomingRemindersWidget";
import { Loader2 } from "lucide-react";
import { useTournamentIdParam, pickTournamentId } from "@/hooks/useTournamentIdParam";

export default function SetupChecklistPage() {
  const { org } = useOrgContext();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<{ title: string; date: string | null } | null>(null);
  const [selectedTournamentId] = useTournamentIdParam();

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data || []) as { id: string; title: string; date: string | null }[];
        const id = pickTournamentId(list, selectedTournamentId) || null;
        setTournamentId(id);
        setTournament(list.find((t) => t.id === id) || null);
        setLoading(false);
      });
  }, [org, selectedTournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournamentId) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Setup Checklist</h1>
        <p className="text-muted-foreground">
          Create your first tournament to start your setup checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Setup Checklist
        </h1>
        <p className="text-muted-foreground mt-1">
          Walk through every step needed to launch your tournament. Click any task to jump
          straight to that section. Tasks auto-complete as you save your work.
        </p>
      </div>
      <SetupChecklist tournamentId={tournamentId} autoRecompute />
      {/* Timeline of Due Dates moved here from Home (Home no longer has a Timeline tab). */}
      <div className="mt-8">
        <EventTimeline eventDate={tournament?.date ?? null} title={tournament?.title} tournamentId={tournamentId} />
      </div>
      <div className="mt-6">
        <UpcomingRemindersWidget tournamentId={tournamentId} />
      </div>
    </div>
  );
}
