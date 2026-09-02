import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrgContext } from "@/hooks/useOrgContext";
import { CollegeScoringWorkspace } from "@/components/scoring/CollegeScoringWorkspace";
import { CollegeEventSetupCard } from "@/components/scoring/CollegeEventSetupCard";
import { ScoringAdminsCard } from "@/components/scoring/ScoringAdminsCard";
import { CollegePairingsCard } from "@/components/scoring/CollegePairingsCard";
import { CollegeOutputsCard } from "@/components/scoring/CollegeOutputsCard";
import { createOrgAdapter, type ScoringEvent } from "@/lib/collegeScoringAdapter";

/**
 * College Golf Scoring: high-speed score validation and entry for multi-division
 * team events (5 players per team, best 4 scores, up to 6 rounds).
 */
const CollegeScoring = () => {
  const { org, loading } = useOrgContext();
  const baseAdapter = useMemo(() => (org ? createOrgAdapter(org.orgId) : null), [org?.orgId]);
  const [allEvents, setAllEvents] = useState<ScoringEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [currentEventId, setCurrentEventId] = useState("");

  /** Only events with a paid (or admin-enabled) College Golf Scoring add-on are scoreable. */
  const adapter = useMemo(
    () =>
      baseAdapter
        ? { ...baseAdapter, listEvents: async () => (await baseAdapter.listEvents()).filter((e) => e.entitled) }
        : null,
    [baseAdapter],
  );

  useEffect(() => {
    if (!baseAdapter) return;
    baseAdapter
      .listEvents()
      .then((full) => {
        setAllEvents(full);
        setEventsLoaded(true);
        const list = full.filter((e) => e.entitled);
        setEvents(list);
        try {
          const stored = localStorage.getItem("collegeScoringEventId") || "";
          setCurrentEventId(stored && list.some((e) => e.id === stored) ? stored : list[0]?.id || "");
        } catch {
          setCurrentEventId(list[0]?.id || "");
        }
      })
      .catch(() => {
        setAllEvents([]);
        setEvents([]);
        setEventsLoaded(true);
      });
  }, [baseAdapter]);

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) || null,
    [events, currentEventId],
  );

  if (loading || !adapter) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (eventsLoaded && events.length === 0) {
    const upsellId = allEvents[0]?.id;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            College Golf Scoring
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            A per-event add-on for multi-division team scoring.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Add-on required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              None of your events have the College Golf Scoring &amp; Leaderboard add-on yet. Unlock it for an
              event to set up divisions, teams (best 4 of 5), fast score entry and scoring admins.
            </p>
            <div className="flex flex-wrap gap-2">
              {upsellId ? (
                <Button asChild>
                  <Link to={`/dashboard/tournaments/${upsellId}/addons/college-scoring`}>
                    <GraduationCap className="h-4 w-4 mr-2" /> Unlock for an event
                  </Link>
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link to="/college-golf-scoring">See what&apos;s included</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <TabsTrigger value="pairings">Pairings &amp; Formats</TabsTrigger>
          <TabsTrigger value="outputs">Printables, QR &amp; Leaderboard</TabsTrigger>
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
                  maxDivisions={event.divisionsPurchased || undefined}
                  onChanged={() => {
                    reload();
                    adapter.listEvents().then(setEvents).catch(() => {});
                  }}
                />
              );
            }}
          />
        </TabsContent>

        <TabsContent value="pairings">
          {currentEvent ? (
            <CollegePairingsCard event={currentEvent} />
          ) : (
            <p className="text-sm text-muted-foreground">Select an event on the Score Entry tab first.</p>
          )}
        </TabsContent>

        <TabsContent value="outputs">
          {currentEvent ? (
            <CollegeOutputsCard event={currentEvent} />
          ) : (
            <p className="text-sm text-muted-foreground">Select an event on the Score Entry tab first.</p>
          )}
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
