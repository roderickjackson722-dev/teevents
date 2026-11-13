import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, MapPin, Users, Search, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { sortTournamentsForPicker, isPastTournament } from "@/lib/tournamentOrder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Ev = { id: string; title: string; date: string | null; end_date: string | null; status: string; course_name: string | null; location: string | null };
type Filter = "all" | "upcoming" | "past" | "drafts";

const statusLabel = (e: Ev) => {
  if (isPastTournament(e)) return "Completed";
  return e.status === "published" ? "Published" : e.status === "draft" ? "Draft" : e.status.charAt(0).toUpperCase() + e.status.slice(1);
};

/** Read-only list of every tournament in the current workspace; opening one only switches dashboard context. */
export default function MyEvents() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!org?.orgId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("tournaments")
        .select("id, title, date, end_date, status, course_name, location")
        .eq("organization_id", org.orgId);
      const list = sortTournamentsForPicker((data as Ev[]) || []);
      if (cancelled) return;
      setEvents(list);
      const entries = await Promise.all(list.map(async (e) => {
        const { count } = await supabase.from("tournament_registrations").select("id", { count: "exact", head: true }).eq("tournament_id", e.id);
        return [e.id, count ?? 0] as const;
      }));
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [org?.orgId]);

  const shown = useMemo(() => (events || []).filter((e) => {
    const past = isPastTournament(e);
    if (filter === "upcoming" && (past || e.status === "draft")) return false;
    if (filter === "past" && !past) return false;
    if (filter === "drafts" && (past || e.status !== "draft")) return false;
    const term = q.trim().toLowerCase();
    return !term || [e.title, e.course_name, e.location].some((v) => v?.toLowerCase().includes(term));
  }), [events, q, filter]);

  const open = (id: string) => {
    try { localStorage.setItem("selectedTournamentId", id); } catch { /* ignore */ }
    const next = new URLSearchParams();
    for (const k of ["admin_org", "sample_org", "sample"]) { const v = searchParams.get(k); if (v) next.set(k, v); }
    next.set("tournament_id", id);
    navigate(`/dashboard?${next.toString()}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">All My Events</h1>
        <p className="text-muted-foreground">Every tournament in this account. Choose Open to manage that event.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search events" placeholder="Search by name or course" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "upcoming", "drafts", "past"] as Filter[]).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : f === "drafts" ? "Drafts" : "Past"}
            </Button>
          ))}
        </div>
      </div>
      {events === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : shown.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No events match.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-lg leading-tight text-foreground">{e.title}</h2>
                  <Badge variant="secondary" className="shrink-0">{statusLabel(e)}</Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{e.date ? new Date(`${e.date.slice(0, 10)}T12:00:00`).toLocaleDateString() : "Date not set"}</p>
                  {(e.course_name || e.location) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{e.course_name || e.location}</p>}
                  <p className="flex items-center gap-2"><Users className="h-4 w-4" />{counts[e.id] ?? "…"} registrations</p>
                </div>
                <Button className="mt-auto self-start" onClick={() => open(e.id)}>Open <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
