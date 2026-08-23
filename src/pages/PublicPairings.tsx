import { useEffect, useMemo, useState } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, MapPin, CalendarDays, Flag, Mail, PencilLine, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTeeTime } from "@/components/printables/CartSignsTab";
import { resolvePairingsPageConfig } from "@/lib/pairingsPageConfig";
import {
  parsePairingsConfig,
  startingHoleLabelForGroup,
  teeTimeForGroup,
  dayCfgOf,
  roundLabel,
  roundDateFor,
} from "@/lib/pairingsConfig";

interface Row {
  tournament_id: string;
  title: string;
  event_date: string | null;
  course_name: string | null;
  start_format: string | null;
  page_config: unknown;
  pairings_config?: unknown;
  logo_url: string | null;
  hero_image_url: string | null;
  contact_email: string | null;
  active_round?: number | null;
  group_number: number | null;
  starting_hole: number | null;
  tee_time: string | null;
  team_name: string | null;
  flight_name: string | null;
  first_name: string;
  last_name: string;
  group_position: number | null;
}

/** Public, read-only tee sheet / pairings page: /pairings/$slug */
export default function PublicPairings() {
  const params = useParams({ strict: false }) as { slug?: string };
  const search = useSearch({ strict: false }) as { code?: string };
  const slug = params.slug ?? "";
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (supabase as any)
      .rpc("get_public_pairings", { _slug: slug })
      .then(({ data }: any) => {
        if (!cancelled) setRows((data || []) as Row[]);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const info = rows?.[0];
  const cfg = useMemo(() => resolvePairingsPageConfig(info?.page_config), [info?.page_config]);
  const pairingsCfg = useMemo(() => parsePairingsConfig(info?.pairings_config), [info?.pairings_config]);
  // Organizers can pin a round; otherwise the feed resolves the first open round.
  const day = Math.max(
    0,
    Number(pairingsCfg.publishedRound || info?.active_round || pairingsCfg.activeRound + 1) - 1,
  );

  const dayCfg = useMemo(() => dayCfgOf(pairingsCfg, day), [pairingsCfg, day]);
  const teeTimeStart =
    (pairingsCfg.byDay[String(day)]?.startFormat || info?.start_format || "") === "tee_times";
  const shotgunTime = !teeTimeStart ? formatTeeTime(dayCfg.shotgunTime) : null;
  const showRoundLabel = (pairingsCfg.rounds || 1) > 1;
  /** Each round can have its own play date; fall back to the tournament date. */
  const displayDate = roundDateFor(pairingsCfg, day, info?.event_date ?? null);

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
          const at = teeTimeForGroup(pairingsCfg, a.number, day) || a.players[0]?.tee_time || "";
          const bt = teeTimeForGroup(pairingsCfg, b.number, day) || b.players[0]?.tee_time || "";
          if (at !== bt) return at.localeCompare(bt);
        }
        return a.number - b.number;
      });
  }, [rows, teeTimeStart, pairingsCfg, day]);

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

  const accent = cfg.accent || "#1a5c38";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 py-10 flex-1">
        <header className="mb-8">
          {cfg.show_logo && info?.logo_url && (
            <img src={info.logo_url} alt={`${info?.title ?? "Tournament"} logo`} className="h-16 w-auto mb-4 object-contain" />
          )}
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: accent }}>
            {showRoundLabel ? `${roundLabel(day)} — ` : ""}{teeTimeStart ? "Tee Times" : "Shotgun Start"}
          </p>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {cfg.headline?.trim() || info?.title}
          </h1>
          {cfg.headline?.trim() && (
            <p className="text-sm text-muted-foreground mt-1">{info?.title}</p>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {cfg.show_date && (cfg.date_text?.trim() || cfg.date_override?.trim() || displayDate) && (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{
                cfg.date_text?.trim()
                  ? cfg.date_text
                  : new Date(`${cfg.date_override?.trim() || displayDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
              }</span>
            )}
            {cfg.show_course && (cfg.course_override?.trim() || info?.course_name) && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{cfg.course_override?.trim() || info?.course_name}</span>}
          </div>

          {cfg.intro?.trim() && (
            <p className="mt-4 text-sm text-foreground/80 whitespace-pre-line">{cfg.intro}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/t/${slug}/scoring${search.code ? `?code=${encodeURIComponent(search.code)}` : ""}`}>
                <PencilLine className="h-4 w-4 mr-2" /> Enter Scores
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/live/${slug}`} target="_blank" rel="noopener noreferrer">
                <Trophy className="h-4 w-4 mr-2" /> Live Leaderboard
              </a>
            </Button>
          </div>
        </header>

        {cfg.notes?.trim() && (
          <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
            {cfg.notes_title?.trim() && (
              <p className="text-sm font-semibold text-foreground mb-1">{cfg.notes_title}</p>
            )}
            <p className="text-sm text-muted-foreground whitespace-pre-line">{cfg.notes}</p>
          </div>
        )}

        {shotgunTime && (
          <div className="mb-6 rounded-xl border p-4 text-center" style={{ borderColor: accent }}>
            <p className="text-sm text-muted-foreground">Shotgun start — every group tees off at</p>
            <p className="text-2xl font-display font-bold" style={{ color: accent }}>{shotgunTime}</p>
            <p className="text-xs text-muted-foreground mt-1">Find your starting hole below.</p>
          </div>
        )}

        <div className="space-y-3">
          {groups.map((g) => {
            const tee = teeTimeStart
              ? formatTeeTime(teeTimeForGroup(pairingsCfg, g.number, day) || g.players[0]?.tee_time)
              : null;
            const flight = g.players.map((p) => p.flight_name).find(Boolean);
            const teamName = cfg.show_team_names ? g.players[0]?.team_name : null;
            // Starting hole mirrors the Pairings tab: the saved hole label, then the
            // group's assigned starting hole — never the group number.
            const hole =
              pairingsCfg.labels[String(g.number)] ||
              (g.players[0]?.starting_hole != null ? String(g.players[0].starting_hole) : null) ||
              startingHoleLabelForGroup(pairingsCfg, g.number, day);
            return (
              <div key={g.number} className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-foreground">
                    {teamName || (teeTimeStart || !hole ? `Group ${g.number}` : `Hole ${hole}`)}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    {cfg.show_flights && flight && <span className="text-muted-foreground">{flight}</span>}
                    {cfg.show_tee_times && tee && (
                      <span className="flex items-center gap-1 font-bold" style={{ color: accent }}>
                        <Clock className="h-4 w-4" />{tee}
                      </span>
                    )}
                    {cfg.show_starting_hole && hole && (
                      <span className="font-semibold" style={{ color: accent }}>Hole {hole}</span>
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

        {(cfg.footer_note?.trim() || (cfg.show_contact && (cfg.contact_override?.trim() || info?.contact_email))) && (
          <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
            {cfg.footer_note?.trim() && <p>{cfg.footer_note}</p>}
            {cfg.show_contact && (cfg.contact_override?.trim() || info?.contact_email) && (
              <p className="flex items-center justify-center gap-1">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${cfg.contact_override?.trim() || info?.contact_email}`} className="underline">{cfg.contact_override?.trim() || info?.contact_email}</a>
              </p>
            )}
          </div>
        )}

      </div>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <a href="/" className="hover:underline">TeeVents</a>
      </footer>
    </div>
  );
}
