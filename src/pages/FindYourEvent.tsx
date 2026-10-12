import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinalCta, Hero, OutlineLight, SectionHead, fade } from "@/components/marketing/PageBits";
import { US_STATES } from "@/lib/usStates";
import placeholder from "@/assets/event-placeholder.jpg";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

type Status = "Open" | "Closed" | "Completed";
type Listing = { id: string; kind: "Tournament" | "League"; name: string; start: string | null; end: string | null; time: string | null; location: string | null; state: string | null; format: string; formatKey: string; status: Status; image: string | null; url: string };
const PAGE = 20;
const FORMATS = [["scramble", "Scramble"], ["stroke_play", "Stroke Play"], ["stableford", "Stableford"], ["best_ball", "Best Ball"], ["alternate_shot", "Alternate Shot"]];
const DEFAULTS = { q: "", state: "all", type: "all", format: "all", when: "upcoming", sort: "soonest", page: "1" };
type Filters = typeof DEFAULTS;
const fmtDate = (d: string | null) => d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Date to be announced";
const fmtTime = (t: string | null) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); if (isNaN(h)) return ""; return ` at ${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const pretty = (f: string | null) => f ? f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Golf Event";
const badge: Record<Status, string> = { Open: "bg-golf-green text-primary-foreground", Closed: "bg-muted text-muted-foreground", Completed: "bg-primary text-primary-foreground" };
const label: Record<Status, string> = { Open: "Open", Closed: "Registration Closed", Completed: "Completed" };

function EventCard({ e, wide }: { e: Listing; wide?: boolean }) {
  const loc = [e.location, e.state].filter(Boolean).join(", ");
  return (
    <motion.article {...fade} className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${wide ? "w-[85vw] shrink-0 snap-start sm:w-auto" : ""}`}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img src={e.image || placeholder} alt="" loading="lazy" width={1280} height={720} className="h-full w-full object-cover transition group-hover:scale-105" />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${badge[e.status]}`}>{label[e.status]}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{e.kind}</p>
        <h3 className="font-display text-xl font-bold text-primary">{e.name}</h3>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{fmtDate(e.start)}{fmtTime(e.time)}</p>
        {loc && <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{loc}</p>}
        <p className="text-sm text-foreground">{e.format}</p>
        <Button asChild variant="secondary" className="mt-auto font-semibold"><Link to={e.url}>View Event</Link></Button>
      </div>
    </motion.article>
  );
}

export default function FindYourEvent() {
  const hideFeatured = useFeatureFlag("hide_featured_events");
  const hideUpcoming = useFeatureFlag("hide_upcoming_events");
  const [hasSearched, setHasSearched] = useState(false);
  const [params, setParams] = useSearchParams();
  const applied: Filters = useMemo(() => Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, params.get(k) || v])) as Filters, [params]);
  const [draft, setDraft] = useState<Filters>(applied);
  useEffect(() => setDraft(applied), [applied]);
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const commit = (f: Filters) => {
    setHasSearched(true);
    const next = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v && v !== (DEFAULTS as any)[k]) next.set(k, v); });
    setParams(next);
  };

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [t, l] = await Promise.all([
        supabase.from("tournaments").select("id, title, slug, custom_slug, date, end_date, start_time, location, state, course_name, scoring_format, registration_open, site_hero_image_url, image_url")
          .eq("show_in_public_search", true).eq("site_published", true).limit(1000),
        supabase.from("golf_leagues").select("id, league_name, league_slug, start_date, end_date, is_active, allow_search, logo_url")
          .eq("is_public", true).eq("publish_status", "published").limit(500),
      ]);
      const done = (s: string | null, e: string | null) => { const last = (e || s || "").slice(0, 10); return !!last && last < today; };
      const tours: Listing[] = (t.data || []).map((r: any) => ({
        id: r.id, kind: "Tournament", name: r.title, start: r.date, end: r.end_date, time: r.start_time,
        location: r.location || r.course_name, state: r.state, format: pretty(r.scoring_format), formatKey: r.scoring_format || "",
        status: done(r.date, r.end_date) ? "Completed" : r.registration_open ? "Open" : "Closed",
        image: r.site_hero_image_url || r.image_url, url: r.custom_slug ? `/tournament/${r.custom_slug}` : `/t/${r.slug}`,
      }));
      const leagues: Listing[] = (l.data || []).filter((r: any) => r.allow_search !== false).map((r: any) => ({
        id: r.id, kind: "League", name: r.league_name, start: r.start_date, end: r.end_date, time: null, location: null, state: null,
        format: "League", formatKey: "league", status: done(r.start_date, r.end_date) ? "Completed" : r.is_active ? "Open" : "Closed", image: null, url: `/league/${r.league_slug}`,
      }));
      setAll([...tours, ...leagues]);
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    const now = new Date(); const today = now.toISOString().slice(0, 10);
    const week = new Date(now.getTime() + 7 * 864e5).toISOString().slice(0, 10);
    const q = applied.q.trim().toLowerCase();
    const list = all.filter(e => {
      if (q && !`${e.name} ${e.location ?? ""} ${e.state ?? ""}`.toLowerCase().includes(q)) return false;
      if (applied.state !== "all" && e.state !== applied.state) return false;
      if (applied.type !== "all" && e.kind.toLowerCase() !== applied.type) return false;
      if (applied.format !== "all" && !e.formatKey.toLowerCase().includes(applied.format)) return false;
      const s = (e.start || "").slice(0, 10);
      if (applied.when === "past") return e.status === "Completed";
      if (e.status === "Completed") return false;
      if (applied.when === "week" && !(s && s <= week)) return false;
      if (applied.when === "month" && !s.startsWith(today.slice(0, 7))) return false;
      if (applied.when === "year" && !s.startsWith(today.slice(0, 4))) return false;
      return true;
    });
    const by = { soonest: (a: Listing, b: Listing) => (a.start || "9999").localeCompare(b.start || "9999"), latest: (a: Listing, b: Listing) => (b.start || "").localeCompare(a.start || ""), name: (a: Listing, b: Listing) => a.name.localeCompare(b.name), location: (a: Listing, b: Listing) => `${a.state ?? "zz"}${a.location ?? ""}`.localeCompare(`${b.state ?? "zz"}${b.location ?? ""}`) } as const;
    return list.sort(by[applied.sort as keyof typeof by] || by.soonest);
  }, [all, applied]);

  const featured = useMemo(() => all.filter(e => e.status === "Open").sort((a, b) => Number(!!b.image) - Number(!!a.image) || (a.start || "9999").localeCompare(b.start || "9999")).slice(0, 3), [all]);
  const pages = Math.max(1, Math.ceil(results.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(applied.page) || 1));
  const shown = results.slice((page - 1) * PAGE, page * PAGE);
  const stateName = (c: string) => US_STATES.find(s => s.code === c)?.name || c;
  const chips: [keyof Filters, string][] = [
    ...(applied.q ? [["q", `"${applied.q}"`] as [keyof Filters, string]] : []),
    ...(applied.state !== "all" ? [["state", stateName(applied.state)] as [keyof Filters, string]] : []),
    ...(applied.type !== "all" ? [["type", pretty(applied.type)] as [keyof Filters, string]] : []),
    ...(applied.format !== "all" ? [["format", pretty(applied.format)] as [keyof Filters, string]] : []),
    ...(applied.when !== "upcoming" ? [["when", { week: "This Week", month: "This Month", year: "This Year", past: "Past Events" }[applied.when] || applied.when] as [keyof Filters, string]] : []),
  ];
  const sel = (k: keyof Filters, lbl: string, opts: string[][], extra?: React.ReactNode) => (
    <div className="space-y-1"><Label>{lbl}</Label>
      <Select value={draft[k]} onValueChange={v => setDraft({ ...draft, [k]: v })}><SelectTrigger aria-label={lbl}><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}{extra}</SelectContent></Select></div>
  );

  return (
    <Layout>
      <Hero eyebrow="FIND YOUR EVENT" title="Find a Tournament or League Near You" subtitle="Browse upcoming golf events on TeeVents. Register in minutes and follow the live leaderboard all day.">
        <p className="mt-4 text-primary-foreground/70">No account required to browse. Free to register for most events.</p>
      </Hero>

      <section className="relative z-10 -mt-10 px-4"><div className="container mx-auto max-w-6xl">
        <form onSubmit={e => { e.preventDefault(); commit({ ...draft, page: "1" }); setShowFilters(false); }} className="rounded-xl border border-border bg-card p-4 shadow-lg md:p-6">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search events" placeholder="Search by event name, city, or course" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} className="h-12 pl-10 text-base" /></div>
            <Button type="button" variant="outline" className="h-12 md:hidden" aria-expanded={showFilters} onClick={() => setShowFilters(s => !s)}><SlidersHorizontal /> Filters</Button>
          </div>
          <div className={`${showFilters ? "grid" : "hidden"} mt-4 gap-4 sm:grid-cols-2 md:grid md:grid-cols-5`}>
            {sel("state", "State", [["all", "All States"], ...US_STATES.map(s => [s.code, s.name])])}
            {sel("type", "Event Type", [["all", "All"], ["tournament", "Tournament"], ["league", "League"]])}
            {sel("format", "Format", [["all", "All"], ...FORMATS])}
            {sel("when", "Date Range", [["upcoming", "All Upcoming"], ["week", "This Week"], ["month", "This Month"], ["year", "This Year"], ["past", "Past Events"]])}
            <div className="space-y-1"><Label>Sport</Label><Select value="golf"><SelectTrigger aria-label="Sport"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="golf">Golf</SelectItem><SelectItem value="multi" disabled>Multi-Sport (coming soon)</SelectItem></SelectContent></Select></div>
          </div>
          <Button type="submit" variant="secondary" size="lg" className="mt-4 w-full font-bold md:w-auto"><Search /> SEARCH EVENTS</Button>
          {chips.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{chips.map(([k, t]) => (
            <button type="button" key={k} onClick={() => commit({ ...applied, [k]: DEFAULTS[k], page: "1" })} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-foreground hover:bg-secondary/35">{t}<X className="h-3.5 w-3.5" aria-label={`Remove ${t}`} /></button>))}</div>}
        </form>
      </div></section>

      {!hideFeatured.loading && !hideFeatured.enabled && featured.length > 0 && <section className="py-16"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title="Featured Events" subtitle="Highlighted tournaments and leagues from our partners." />
        <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">{featured.map(e => <EventCard key={`f-${e.id}`} e={e} wide />)}</div>
      </div></section>}

      {!hideUpcoming.loading && (!hideUpcoming.enabled || hasSearched || params.toString().length > 0) && <section className="bg-muted/40 py-16"><div className="container mx-auto max-w-6xl px-4">
        <SectionHead title={hideUpcoming.enabled ? "Search Results" : "Upcoming Events"} subtitle="Public tournaments and leagues on TeeVents." />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{loading ? "Loading events..." : `${results.length} event${results.length === 1 ? "" : "s"} found`}</p>
          <div className="flex items-center gap-2"><Label htmlFor="sort">Sort by</Label>
            <Select value={applied.sort} onValueChange={v => commit({ ...applied, sort: v, page: "1" })}><SelectTrigger id="sort" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="soonest">Date (Soonest)</SelectItem><SelectItem value="latest">Date (Latest)</SelectItem><SelectItem value="name">Name (A-Z)</SelectItem><SelectItem value="location">Location (A-Z)</SelectItem></SelectContent></Select></div>
        </div>
        {!loading && results.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
            <h3 className="font-display text-2xl font-bold text-primary">No Events Found</h3>
            <p className="mt-2 text-muted-foreground">Try adjusting your filters or search a different location.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="secondary" className="font-bold" onClick={() => commit(DEFAULTS)}>CLEAR FILTERS</Button>
              <Button asChild variant="outline"><Link to="/get-started">HOST YOUR OWN EVENT</Link></Button>
            </div>
          </div>
        ) : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{shown.map(e => <EventCard key={`${e.kind}-${e.id}`} e={e} />)}</div>}
        {pages > 1 && <div className="mt-10 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page === 1} onClick={() => commit({ ...applied, page: String(page - 1) })}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page === pages} onClick={() => commit({ ...applied, page: String(page + 1) })}>Next</Button>
        </div>}
      </div></section>}

      <section className="py-16"><motion.div {...fade} className="container mx-auto max-w-4xl rounded-2xl border-l-4 border-secondary bg-primary px-6 py-12 text-center text-primary-foreground md:px-12">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Do Not See Your Event? Host Your Own.</h2>
        <p className="mt-3 text-lg text-secondary">TeeVents makes it easy to run a tournament or league. Free for organizers.</p>
        <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/85">Whether you are running a charity tournament, a corporate outing, or a season-long league, TeeVents handles registration, payments, pairings, scoring, and everything in between. A dedicated rep builds your event for you.</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild variant="secondary" size="lg" className="font-bold"><Link to="/get-started">GET STARTED FREE</Link></Button>
          <OutlineLight to="/how-it-works">LEARN HOW IT WORKS</OutlineLight>
        </div>
      </motion.div></section>

      <FinalCta title="Ready to Join the TeeVents Community?" subtitle="Find your next tournament or start your own. It is free for organizers.">
        <Button variant="secondary" size="lg" className="font-bold" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>FIND A TOURNAMENT</Button>
        <OutlineLight to="/get-started">HOST YOUR OWN EVENT</OutlineLight>
      </FinalCta>
    </Layout>
  );
}
