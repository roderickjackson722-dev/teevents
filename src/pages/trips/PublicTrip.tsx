import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";

/**
 * Public, read-only view for trip participants. Accessed via share_token (no login required).
 * Reads through an edge function that bypasses RLS using the service role.
 */
export default function PublicTrip() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-public-trip", { body: { token } });
      if (error || !data?.trip) {
        setError("Trip not found or link expired.");
        return;
      }
      setData(data);
    })();
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{error}</p></CardContent></Card>
      </div>
    );
  }
  if (!data) return null;

  const { trip, participants, agenda, tee_times, rooms, skins_leaderboard } = data;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${trip.title} | Group Trip`} description={trip.description || `Golf group trip in ${trip.destination || ""}`} />
      <div className="bg-primary text-primary-foreground py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl">{trip.title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm opacity-90">
            {trip.destination && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {trip.destination}</span>}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {format(new Date(trip.start_date), "MMM d")} – {format(new Date(trip.end_date), "MMM d, yyyy")}
            </span>
          </div>
          {trip.description && <p className="mt-3 max-w-2xl opacity-90">{trip.description}</p>}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="agenda">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="tee-times">Tee Times</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-4 space-y-3">
            {agenda.length === 0 ? <p className="text-muted-foreground text-sm">No agenda yet.</p> :
              Object.entries(agenda.reduce((acc: any, i: any) => { (acc[i.day] = acc[i.day] || []).push(i); return acc; }, {})).map(([day, items]: any) => (
                <Card key={day}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{format(new Date(day + "T00:00:00"), "EEEE, MMM d")}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-sm">
                      {items.map((it: any) => (
                        <li key={it.id}><span className="font-mono text-muted-foreground mr-2">{it.time?.slice(0, 5) || "—"}</span>{it.activity}{it.location && <span className="text-muted-foreground"> @ {it.location}</span>}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))
            }
          </TabsContent>

          <TabsContent value="tee-times" className="mt-4 space-y-3">
            {tee_times.length === 0 ? <p className="text-muted-foreground text-sm">No tee times posted.</p> :
              tee_times.map((tt: any) => (
                <Card key={tt.id}>
                  <CardContent className="pt-4">
                    <div className="font-semibold">{tt.tee_time?.slice(0, 5)} — {format(new Date(tt.day + "T00:00:00"), "MMM d")}</div>
                    <div className="text-sm text-muted-foreground">{tt.course_name} {tt.group_name && `· ${tt.group_name}`}</div>
                    <div className="mt-2 text-sm">{(tt.players || []).map((pid: string) => participants.find((p: any) => p.id === pid)?.name).filter(Boolean).join(", ")}</div>
                  </CardContent>
                </Card>
              ))
            }
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card><CardContent className="pt-4">
              {skins_leaderboard.length === 0 ? <p className="text-muted-foreground text-sm">No standings yet.</p> :
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground border-b">
                    <tr><th className="py-2">#</th><th>Player</th><th>Skins</th><th>Winnings</th></tr>
                  </thead>
                  <tbody>
                    {skins_leaderboard.map((r: any, i: number) => (
                      <tr key={r.name} className="border-b last:border-0">
                        <td className="py-2 font-mono">{i + 1}</td><td className="font-medium">{r.name}</td>
                        <td>{r.skins}</td><td>${(r.cents / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="rooms" className="mt-4 space-y-3">
            {rooms.length === 0 ? <p className="text-muted-foreground text-sm">No rooming list posted.</p> :
              rooms.map((r: any) => (
                <Card key={r.id}><CardContent className="pt-4">
                  <div className="font-semibold">Room {r.room_number || "—"} <span className="text-xs text-muted-foreground ml-2 uppercase">{r.room_type}</span></div>
                  <div className="text-sm mt-1">{(r.occupants || []).map((pid: string) => participants.find((p: any) => p.id === pid)?.name).filter(Boolean).join(", ")}</div>
                </CardContent></Card>
              ))
            }
          </TabsContent>

          <TabsContent value="participants" className="mt-4">
            <Card><CardContent className="pt-4">
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {participants.map((p: any) => <li key={p.id}>{p.name}{p.handicap_index != null && <span className="text-muted-foreground"> ({p.handicap_index})</span>}</li>)}
              </ul>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
