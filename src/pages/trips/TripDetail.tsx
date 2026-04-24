import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Share2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import TripParticipants from "@/components/trips/TripParticipants";
import TripAgenda from "@/components/trips/TripAgenda";
import TripTeeTimes from "@/components/trips/TripTeeTimes";
import TripGames from "@/components/trips/TripGames";
import TripSkins from "@/components/trips/TripSkins";
import TripPayments from "@/components/trips/TripPayments";
import TripRooms from "@/components/trips/TripRooms";
import TripLeaderboard from "@/components/trips/TripLeaderboard";

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enabled, loading: flagLoading } = useFeatureFlag("enable_group_trips");
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("golf_trips")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Trip not found");
        navigate("/trips");
        return;
      }
      setTrip(data);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (flagLoading || loading) return null;
  if (!enabled) {
    navigate("/");
    return null;
  }
  if (!trip) return null;

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("golf_trips").update({ status }).eq("id", trip.id);
    if (error) return toast.error(error.message);
    setTrip({ ...trip, status });
    toast.success("Status updated");
  };

  const deleteTrip = async () => {
    if (!confirm("Delete this trip and all its data? This cannot be undone.")) return;
    const { error } = await supabase.from("golf_trips").delete().eq("id", trip.id);
    if (error) return toast.error(error.message);
    toast.success("Trip deleted");
    navigate("/trips");
  };

  const copyShare = () => {
    const url = `${window.location.origin}/trips/public/${trip.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-4 max-w-6xl mx-auto pb-12">
        <Button variant="ghost" size="sm" onClick={() => navigate("/trips")} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> All trips
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-2xl">{trip.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {trip.destination ? `${trip.destination} · ` : ""}
                  {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={trip.status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={copyShare}>
                  <Share2 className="h-4 w-4 mr-1" /> Share
                </Button>
                <Button variant="outline" size="sm" onClick={deleteTrip}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {trip.description && <p className="text-sm mt-2">{trip.description}</p>}
          </CardHeader>
        </Card>

        <Tabs defaultValue="participants">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="tee-times">Tee Times</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="skins">Skins</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="participants"><TripParticipants tripId={trip.id} /></TabsContent>
          <TabsContent value="agenda"><TripAgenda tripId={trip.id} /></TabsContent>
          <TabsContent value="tee-times"><TripTeeTimes tripId={trip.id} /></TabsContent>
          <TabsContent value="games"><TripGames tripId={trip.id} /></TabsContent>
          <TabsContent value="leaderboard"><TripLeaderboard tripId={trip.id} /></TabsContent>
          <TabsContent value="skins"><TripSkins tripId={trip.id} /></TabsContent>
          <TabsContent value="rooms"><TripRooms tripId={trip.id} /></TabsContent>
          <TabsContent value="payments"><TripPayments tripId={trip.id} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
