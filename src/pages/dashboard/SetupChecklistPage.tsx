import { useEffect, useState } from "react";
import { useOrgContext } from "@/hooks/useOrgContext";
import { supabase } from "@/integrations/supabase/client";
import SetupChecklist from "@/components/SetupChecklist";
import { Loader2 } from "lucide-react";

export default function SetupChecklistPage() {
  const { org } = useOrgContext();
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setTournamentId(data?.id ?? null);
        setLoading(false);
      });
  }, [org]);

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
      <SetupChecklist tournamentId={tournamentId} />
    </div>
  );
}
