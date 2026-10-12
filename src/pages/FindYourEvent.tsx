import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { US_STATES } from "@/lib/usStates";

type Listing = {
  id: string; kind: "Tournament" | "League"; name: string; start: string | null; end: string | null;
  location: string | null; state: string | null; sport: string; format: string; status: "Open" | "Closed"; url: string;
};
const PAGE = 20;

const fmtDate = (d: string | null) => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date to be announced";
const fmtFormat = (f: string | null) => f ? f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Golf Event";

export default function FindYourEvent() {
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState({ q: "", state: "any", type: "any", sport: "golf", when: "upcoming" });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const [t, l] = await Promise.all([
        supabase.from("tournaments").select("id, title, slug, custom_slug, date, end_date, location, state, course_name, scoring_format, registration_open, sport_type")
          .eq("show_in_public_search", true).eq("site_published", true).limit(1000),
        supabase.from("golf_leagues").select("id, league_name, league_slug, start_date, end_date, is_active, allow_search")
          .eq("is_public", true).eq("publish_status", "published").limit(500),
      ]);
      const tours: Listing[] = (t.data || []).map((r: any) => ({
        id: r.id, kind: "Tournament", name: r.title, start: r.date, end: r.end_date,
        location: r.location || r.course_name, state: r.state, sport: r.sport_type ? fmtFormat(r.sport_type) : "Golf",
        format: fmtFormat(r.scoring_format), status: r.registration_open ? "Open" : "Closed",
        url: r.custom_slug ? `/tournament/${r.custom_slug}` : `/t/${r.slug}`,
      }));
      const leagues: Listing[] = (l.data || []).filter((r: any) => r.allow_search !== false).map((r: any) => ({
        id: r.id, kind: "League", name: r.league_name, start: r.start_date, end: r.end_date, location: null, state: null,
        sport: "Golf", format: "League", status: r.is_active ? "Open" : "Closed", url: `/league/${r.league_slug}`,
      }));
      setAll([...tours, ...leagues]);
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7), year = today.slice(0, 4);
    const q = applied.q.trim().toLowerCase();
    return all.filter(e => {
      if (q && !`${e.name} ${e.location ?? ""} ${e.format}`.toLowerCase().includes(q)) return false;
      if (applied.state !== "any" && e.state !== applied.state) return false;
      if (applied.type !== "any" && e.kind !== applied.type) return false;
      const last = (e.end || e.start || "").slice(0, 10);
      if (applied.when === "upcoming" && last && last < today) return false;
      if (applied.when === "month" && !(e.start || "").startsWith(month)) return false;
      if (applied.when === "year" && !(e.start || "").startsWith(year)) return false;
      return true;
    }).sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"));
  }, [all, applied]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE));
  const shown = results.slice((page - 1) * PAGE, page * PAGE);
  const search = () => { setApplied(draft); setPage(1); setShowFilters(false); };

  return (
    <Layout>
      <SEO title="Find Your Event | Golf Tournaments and Leagues | TeeVents" description="Browse and register for upcoming golf tournaments and leagues near you on TeeVents." path="/find-your-event" />
      <section className="bg-golf-green-dark px-6 pb-12 pt-28 text-primary-foreground">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="font-display text-3xl font-bold md:text-5xl">Find a Tournament or League on TeeVents</h1>
          <p className="mt-4 text-primary-foreground/80 md:text-lg">Browse and register for upcoming events near you.</p>
        </div>
      </section>
      <section className="bg-background px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <form onSubmit={e => { e.preventDefault(); search(); }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex gap-2">
              <Input aria-label="Search events" placeholder="Event name or keyword" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
              <Button type="button" variant="outline" className="md:hidden" aria-expanded={showFilters} onClick={() => setShowFilters(s => !s)}><SlidersHorizontal /> Filters</Button>
              <Button type="submit" variant="secondary" className="font-semibold"><Search /> Search</Button>
            </div>
            <div className={`${showFilters ? "grid" : "hidden"} mt-4 gap-4 sm:grid-cols-2 md:grid md:grid-cols-4`}>
              <div className="space-y-1"><Label>State</Label>
                <Select value={draft.state} onValueChange={v => setDraft({ ...draft, state: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">All states</SelectItem>{US_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Type</Label>
                <Select value={draft.type} onValueChange={v => setDraft({ ...draft, type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="any">All types</SelectItem><SelectItem value="Tournament">Tournament</SelectItem><SelectItem value="League">League</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Sport</Label>
                <Select value={draft.sport} onValueChange={v => setDraft({ ...draft, sport: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="golf">Golf</SelectItem><SelectItem value="more" disabled>More sports coming soon</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Date</Label>
                <Select value={draft.when} onValueChange={v => setDraft({ ...draft, when: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="month">This month</SelectItem><SelectItem value="year">This year</SelectItem></SelectContent></Select></div>
            </div>
          </form>

          {loading ? <p className="mt-10 text-center text-muted-foreground">Loading events...</p>
            : results.length === 0 ? <p className="mt-10 text-center text-muted-foreground">No events found. Try a different search.</p>
            : <>
              <p className="mt-8 text-sm text-muted-foreground">{results.length} event{results.length === 1 ? "" : "s"} found</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {shown.map(e => (
                  <Card key={`${e.kind}-${e.id}`} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{e.kind}</Badge>
                        <Badge variant={e.status === "Open" ? "default" : "secondary"}>{e.status === "Open" ? "Registration Open" : "Registration Closed"}</Badge>
                      </div>
                      <h2 className="font-display text-xl font-semibold text-primary">{e.name}</h2>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{fmtDate(e.start)}{e.end && e.end.slice(0, 10) !== e.start?.slice(0, 10) ? ` to ${fmtDate(e.end)}` : ""}</p>
                      {(e.location || e.state) && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{e.location && e.state && e.location.includes(e.state) ? e.location : [e.location, e.state].filter(Boolean).join(", ")}</p>}
                      <p className="text-sm text-foreground">{e.sport} · {e.format}</p>
                      <Button asChild variant="secondary" className="mt-auto font-semibold"><Link to={e.url}>View Event</Link></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pages > 1 && <div className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                <Button variant="outline" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>}
            </>}
        </div>
      </section>
    </Layout>
  );
}
