import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Megaphone, Printer, ArrowLeft, MapPin, Trophy, Search } from "lucide-react";
import { TeeventsFooter } from "@/components/TeeventsFooter";
import { DEFAULT_TEAM_HQ_SETTINGS, parseTeamHqSettings, type TeamHqSettings } from "@/lib/teamHqSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  parsePairingsConfig,
  startingHoleLabelForGroup,
  teeTimeForGroup,
  roundDateFor,
  roundLabel,
  dayCfgOf,
  type PairingsConfig,
} from "@/lib/pairingsConfig";

const formatTee = (t?: string | null) => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
  if (!m) return String(t);
  let h = parseInt(m[1], 10);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m[2]} ${suffix}`;
};

interface StarterTournament {
  id: string;
  title: string;
  slug: string | null;
  date: string | null;
  course_name: string | null;
  site_logo_url: string | null;
}

interface StarterRow {
  registration_id: string;
  first_name: string | null;
  last_name: string | null;
  group_number: number | null;
  group_position: number | null;
  team_name: string | null;
  tee_time: string | null;
  division?: string | null;
  hometown?: string | null;
}

const fullName = (r: StarterRow) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();

export default function StarterAnnouncements() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<StarterTournament | null>(null);
  const [roster, setRoster] = useState<StarterRow[]>([]);
  const [hq, setHq] = useState<TeamHqSettings>(DEFAULT_TEAM_HQ_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [query, setQuery] = useState("");
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [pairings, setPairings] = useState<PairingsConfig>(() => parsePairingsConfig(null));
  const [day, setDay] = useState(0);


  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: resolved } = await (supabase as any).rpc("resolve_public_tournament", { _slug: slug });
      const row = Array.isArray(resolved) ? resolved[0] : resolved;
      if (!row?.id) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }
      const [tRes, rRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, title, slug, date, course_name, site_logo_url, team_hq_settings, pairings_config")
          .eq("id", row.id)
          .maybeSingle(),
        (supabase as any).rpc("get_public_team_roster", { _tournament_id: row.id }),
      ]);
      if (cancelled) return;
      const tData: any = tRes.data ?? null;
      const parsed = parseTeamHqSettings(tData?.team_hq_settings);
      setHq(parsed);
      if (tData && (!parsed.enabled || !parsed.show_starter_sheet)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setTournament(tData);
      setPairings(parsePairingsConfig(tData?.pairings_config));
      setRoster(((rRes as any).data || []) as StarterRow[]);
      setTournamentId(row.id);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Keep the starter sheet live as organizers edit pairings or add players.
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    const refresh = async () => {
      const [{ data }, tRes] = await Promise.all([
        (supabase as any).rpc("get_public_team_roster", { _tournament_id: tournamentId }),
        supabase.from("tournaments").select("pairings_config").eq("id", tournamentId).maybeSingle(),
      ]);
      if (cancelled) return;
      setRoster((data || []) as StarterRow[]);
      setPairings(parsePairingsConfig((tRes.data as any)?.pairings_config));
    };
    const channel = supabase
      .channel(`starter-${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_registrations", filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "registration_groups", filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${tournamentId}` }, refresh)
      .subscribe();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) =>
      [fullName(r), r.hometown ?? "", r.division ?? "", r.team_name ?? "", r.group_number != null ? `hole ${r.group_number}` : ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [roster, query]);

  const dayCfg = useMemo(() => dayCfgOf(pairings, day), [pairings, day]);

  const groups = useMemo(() => {
    const map = new Map<string, StarterRow[]>();
    filtered.forEach((r) => {
      const key = r.group_number != null ? String(r.group_number) : "unassigned";
      map.set(key, [...(map.get(key) || []), r]);
    });
    return [...map.entries()]
      .map(([key, players]) => {
        const groupNumber = key === "unassigned" ? null : Number(key);
        const teeTime =
          (groupNumber != null ? teeTimeForGroup(pairings, groupNumber, day) : null) ||
          (dayCfg.startFormat === "shotgun" ? dayCfg.shotgunTime : null) ||
          players.find((p) => p.tee_time)?.tee_time ||
          null;
        return {
          key,
          groupNumber,
          holeLabel: groupNumber != null ? startingHoleLabelForGroup(pairings, groupNumber, day) : null,
          teamName: players.find((p) => p.team_name)?.team_name || null,
          teeTime,
          players: [...players].sort((a, b) => (a.group_position ?? 99) - (b.group_position ?? 99)),
        };
      })
      .sort((a, b) => {
        if (a.key === "unassigned") return 1;
        if (b.key === "unassigned") return -1;
        const t = (a.teeTime || "99:99").localeCompare(b.teeTime || "99:99");
        if (t !== 0) return t;
        return (a.groupNumber ?? 0) - (b.groupNumber ?? 0);
      });
  }, [filtered, pairings, day, dayCfg]);

  const missingHometown = useMemo(() => roster.filter((r) => !r.hometown).length, [roster]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (notFound || !tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <Megaphone className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <h1 className="text-xl font-display font-bold text-foreground">Starter announcements not available</h1>
        <p className="text-muted-foreground mt-1 text-sm">This page is turned off or the tournament could not be found.</p>
      </div>
    );
  }

  const dateStr = tournament.date
    ? new Date(`${tournament.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          {tournament.site_logo_url && (
            <img src={tournament.site_logo_url} alt="" className="h-10 w-10 object-contain rounded" />
          )}
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Starter Announcements</p>
            <h1 className="text-xl font-display font-bold text-foreground leading-tight">{tournament.title}</h1>
            <p className="text-xs text-muted-foreground">{[dateStr, tournament.course_name].filter(Boolean).join(" • ")}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button asChild variant="outline" size="sm">
            <Link to={`/team/${tournament.slug || slug}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Team HQ
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print starter sheet
          </Button>
          {pairings.rounds > 1 && (
            <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: pairings.rounds }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{roundLabel(i)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search player, hometown, division…"
              className="pl-8"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground print:hidden">
          Read each player's name, where they're from or how far they traveled, and their division as they reach the first tee.
          {missingHometown > 0 && ` ${missingHometown} player${missingHometown === 1 ? "" : "s"} have no hometown on file yet.`}
        </p>

        <div className="space-y-3">
          {groups.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No players to announce yet.</p>
          )}
          {groups.map((g) => (
            <section key={g.key} className="rounded-xl border border-border bg-card overflow-hidden break-inside-avoid">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">
                  {g.groupNumber != null
                    ? `Group ${g.groupNumber}${g.holeLabel ? ` • Hole ${g.holeLabel}` : ""}`
                    : "Not assigned to pairings yet"}
                  {g.teamName ? `: ${g.teamName}` : ""}
                </p>
                {g.teeTime && (
                  <span className="text-xs font-semibold text-foreground">{formatTee(g.teeTime)}</span>
                )}
              </div>
              <div className="divide-y divide-border">
                {g.players.map((p) => (
                  <div key={p.registration_id} className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground">{fullName(p) || "—"}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {p.hometown || "Hometown not provided"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-primary" />
                        {p.division || "No division"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="print:hidden">
        <TeeventsFooter tournament={tournament as any} />
      </div>
    </div>
  );
}
