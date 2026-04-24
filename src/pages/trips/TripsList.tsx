import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import TripsDisabled from "@/components/trips/TripsDisabled";

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

const statusColor: Record<string, string> = {
  planning: "bg-blue-500/15 text-blue-700",
  active: "bg-green-500/15 text-green-700",
  completed: "bg-gray-500/15 text-gray-700",
  cancelled: "bg-red-500/15 text-red-700",
};

export default function TripsList() {
  const { enabled, loading: flagLoading } = useFeatureFlag("enable_group_trips");
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/get-started?redirect=/trips");
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("golf_trips")
        .select("id, title, destination, start_date, end_date, status")
        .order("start_date", { ascending: false });
      setTrips(data || []);
      setLoading(false);
    })();
  }, [navigate]);

  if (flagLoading) return null;
  if (!enabled) return <TripsDisabled />;

  const upcoming = trips.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const past = trips.filter((t) => t.status === "completed" || t.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Group Trips | TeeVents" description="Plan and manage your golf group trips." />
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl">Group Trips</h1>
            <p className="text-muted-foreground text-sm">Plan buddies' trips, corporate outings, and travel groups.</p>
          </div>
          <Button onClick={() => navigate("/trips/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Trip
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't created any trips yet.</p>
              <Button onClick={() => navigate("/trips/new")}>
                <Plus className="h-4 w-4 mr-2" /> Create your first trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Section title="Upcoming & Active" trips={upcoming} />
            <Section title="Past" trips={past} />
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, trips }: { title: string; trips: Trip[] }) {
  if (trips.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="font-display text-xl mb-3">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <Link key={t.id} to={`/trips/${t.id}`}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  <Badge className={statusColor[t.status] || ""} variant="secondary">{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {t.destination && (
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {t.destination}</div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(t.start_date), "MMM d")} – {format(new Date(t.end_date), "MMM d, yyyy")}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
