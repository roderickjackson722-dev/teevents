import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgContext } from "@/hooks/useOrgContext";
import { CollegeScoringWorkspace } from "@/components/scoring/CollegeScoringWorkspace";
import { CollegeEventSetupCard } from "@/components/scoring/CollegeEventSetupCard";
import { ScoringAdminsCard } from "@/components/scoring/ScoringAdminsCard";
import { createOrgAdapter, type ScoringEvent } from "@/lib/collegeScoringAdapter";

/**
 * College Golf Scoring: high-speed score validation and entry for multi-division
 * team events (5 players per team, best 4 scores, up to 6 rounds).
 */
const CollegeScoring = () => {
  const { org, loading } = useOrgContext();
  const adapter = useMemo(() => (org ? createOrgAdapter(org.orgId) : null), [org?.orgId]);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState("");

  useEffect(() => {
    if (!adapter) return;
    adapter
      .listEvents()
      .then((list) => {
        setEvents(list);
        try {
          const stored = localStorage.getItem("collegeScoringEventId") || "";
          setCurrentEventId(stored && list.some((e) => e.id === stored) ? stored : list[0]?.id || "");
        } catch {
          setCurrentEventId(list[0]?.id || "");
        }
      })
      .catch(() => setEvents([]));
  }, [adapter]);

  if (loading || !adapter) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          College Golf Scoring
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fast score validation and entry for multi-division team events — divisions, teams of five (best 4
          scores), WD/DQ handling and scoring admins.
        </p>
      </div>

      <Tabs defaultValue="scoring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scoring">Score Entry &amp; Standings</TabsTrigger>
          <TabsTrigger value="admins">Scoring Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring">
          <CollegeScoringWorkspace
            adapter={adapter}
            setupSlot={(event, reload) => {
              if (event.id !== currentEventId) setCurrentEventId(event.id);
              return (
                <CollegeEventSetupCard
                  event={event}
                  onChanged={() => {
                    reload();
                    adapter.listEvents().then(setEvents).catch(() => {});
                  }}
                />
              );
            }}
          />
        </TabsContent>

        <TabsContent value="admins">
          <ScoringAdminsCard
            organizationId={org!.orgId}
            events={events}
            currentEventId={currentEventId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollegeScoring;
