import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, MapPin, CalendarDays, Flag } from "lucide-react";
import { formatTeeTime } from "@/components/printables/CartSignsTab";
import TeeventsFooter from "@/components/TeeventsFooter";

interface Row {
  tournament_id: string;
  title: string;
  event_date: string | null;
  course_name: string | null;
  start_format: string | null;
  group_number: number | null;
  tee_time: string | null;
  team_name: string | null;
  flight_name: string | null;
  first_name: string;
  last_name: string;
  group_position: number | null;
}

/** Public, read-only tee sheet / pairings page: /pairings/:slug */
export default function PublicPairings() {
  const { slug = "" } = useParams();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    (supabase as any).rpc("get_public_pairings", { _slug: slug }).then(({ data }: any) => setRows((data || []) as Row[]));
  }, [slug]);

  const info = rows?.[0];
  const teeTimeStart = (info?.start_format || "") === "tee_times";

  const groups = useMemo(() => {
    const map = new Map<number, Row[]>();
    (rows || []).forEach((r) => {
      const key = r.group_number ?? 0;
      map.set(key, [...(map.get(key) || []), r]);
    });
    return [...map.entries()]
      .map(([number, players]) => ({ number, players }))
      .sort((a, b) => {
        if (teeTimeStart) {
          const at = a.players[0]?.tee_time || "";
          const bt = b.players[0]?.tee_time || "";
          if (at !== bt) return at.localeCompare(bt);
        }
        return a.number - b.number;
      });
  }, [rows, teeTimeStart]);

  if (rows === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-2">
        <Flag className="h-10 w-10 text-muted-foreground/40" />
        <h1 className="text-xl font-display font-bold text-foreground">Pairings not available</h1>
        <p className="text-muted-foreground text-sm">Pairings for this event haven't been published yet. Check back closer to the event.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 py-10 flex-1">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            {teeTimeStart ? "Tee Times" : "Pairings"}
          </p>
          <h1 className="text-3xl font-display font-bold text-foreground">{info?.title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {info?.event_date && (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{new Date(`${info.event_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            )}
            {info?.course_name && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{info.course_name}</span>}
          </div>
        </header>

        <div className="space-y-3">
          {groups.map((g) => {
            const tee = formatTeeTime(g.players[0]?.tee_time);
            const flight = g.players.map((p) => p.flight_name).find(Boolean);
            const teamName = g.players[0]?.team_name;
            return (
              <div key={g.number} className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">
                    {teamName || (teeTimeStart ? `Group ${g.number}` : `Hole ${g.number}`)}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    {flight && <span className="text-muted-foreground">{flight}</span>}
                    {teeTimeStart && tee ? (
                      <span className="flex items-center gap-1 font-bold text-primary"><Clock className="h-4 w-4" />{tee}</span>
                    ) : (
                      <span className="font-semibold text-primary">Hole {g.number}</span>
                    )}
                  </div>
                </div>
                <ul className="text-sm text-foreground/90 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  {g.players.map((p, i) => (
                    <li key={`${p.first_name}-${p.last_name}-${i}`}>{p.first_name} {p.last_name}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <TeeventsFooter />
    </div>
  );
}
