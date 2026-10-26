import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { useEnterpriseEvent } from "@/components/enterprise/useEnterpriseEvent";
import { Button } from "@/components/ui/button";
import { enterpriseLink } from "@/lib/enterpriseNavigation";
import ScoringPayouts from "@/pages/dashboard/ScoringPayouts";

/** Navigation-only wrapper: saves and calculations remain owned by the existing tools. */
export default function EnterpriseSkinsPayouts() {
  const { search } = useLocation();
  const { event, loading } = useEnterpriseEvent();
  const requestedId = new URLSearchParams(search).get("tournament_id");
  const selectedEvent = event && (!requestedId || requestedId === event.id) ? event : null;
  const eventSearch = new URLSearchParams(search);
  if (selectedEvent) eventSearch.set("tournament_id", selectedEvent.id);
  return (
    <EnterpriseLayout title="Skins and Payouts" crumbs={[{ label: "Scores", to: "/enterprise/scores" }, { label: "Skins and Payouts" }]}>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={enterpriseLink("/enterprise/scores", eventSearch.toString())}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to Enterprise Scores</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={enterpriseLink("/enterprise", eventSearch.toString())}>Back to Enterprise Home</Link>
        </Button>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : selectedEvent ? (
        <div className="space-y-5">
          <h2 className="break-words text-lg font-semibold text-foreground">{selectedEvent.title}</h2>
          <ScoringPayouts key={selectedEvent.id} enterpriseEventId={selectedEvent.id} />
        </div>
      ) : <p className="text-muted-foreground">The selected Enterprise event is unavailable.</p>}
    </EnterpriseLayout>
  );
}