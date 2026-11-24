import { useMemo, useState } from "react";
import {
  championshipTotal, isPointsRound, rangeLabel, scoreTeamRound, sortChampionship, sortRoundBoard,
  type CustomScoring, type TeamHoleInput, type TeamRoundResult,
} from "@/lib/customScoring";

interface ScoreRow {
  registration_id: string; hole_number: number; strokes: number; round_number: number;
  first_name?: string | null; last_name?: string | null; group_number?: number | null;
  team_name?: string | null; flight_name?: string | null; group_id?: string | null;
}
interface Props {
  rules: CustomScoring;
  scores: ScoreRow[];
  hiddenProgress?: { registration_id: string; round_number: number; hole_number: number }[];
  holePars: number[] | null;
  publishedRounds: number[];
  fallbackFormat: string;
  /** Dashboard view: hidden holes are shown to organizers. */
  showHidden?: boolean;
}
interface Team { key: string; name: string; members: string[]; division: string; ids: Set<string> }

const fmtToPar = (n: number) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);

/** One row per team, per round board, plus an optional Championship board per division. */
export default function CustomScoringBoards({ rules, scores, hiddenProgress = [], holePars, publishedRounds, fallbackFormat, showHidden }: Props) {
  const pars = holePars && holePars.length >= 18 ? holePars : new Array(18).fill(4);
  const rounds = rules.rounds.map((r) => r.round).sort((a, b) => a - b);
  const [tab, setTab] = useState<string>(rules.championship === "combined" ? "champ" : `r${rounds[0] ?? 1}`);

  const { teams, byTeamRound } = useMemo(() => {
    const teams = new Map<string, Team>();
    const regTeam = new Map<string, string>();
    const input = new Map<string, Record<number, Record<number, TeamHoleInput>>>();
    for (const s of scores) {
      const key = s.group_id || (s.group_number != null ? `g${s.group_number}` : s.registration_id);
      regTeam.set(s.registration_id, key);
      let t = teams.get(key);
      if (!t) { t = { key, name: s.team_name || "", members: [], division: s.flight_name || "", ids: new Set() }; teams.set(key, t); }
      if (!t.ids.has(s.registration_id)) {
        t.ids.add(s.registration_id);
        t.members.push(`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim());
      }
      const rn = Number(s.round_number) || 1;
      const tr = input.get(key) || {}; input.set(key, tr);
      const holes = tr[rn] || {}; tr[rn] = holes;
      const h = holes[s.hole_number] || { players: [] }; holes[s.hole_number] = h;
      h.players.push(s.strokes); h.team = s.strokes;
    }
    for (const p of hiddenProgress) {
      const key = regTeam.get(p.registration_id); if (!key) continue;
      const tr = input.get(key)!; const holes = tr[p.round_number] || {}; tr[p.round_number] = holes;
      holes[p.hole_number] = holes[p.hole_number] || { players: [], hiddenPlayed: true };
    }
    const byTeamRound = new Map<string, Record<number, TeamRoundResult>>();
    for (const [key, tr] of input) {
      const res: Record<number, TeamRoundResult> = {};
      for (const rn of rounds) res[rn] = scoreTeamRound(rules, rn, tr[rn] || {}, pars, fallbackFormat, showHidden || publishedRounds.includes(rn));
      byTeamRound.set(key, res);
    }
    for (const t of teams.values()) if (!t.name) t.name = t.members.join(" & ");
    return { teams: [...teams.values()], byTeamRound };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, hiddenProgress, rules, publishedRounds, showHidden, holePars]);

  const divisions = [...new Set(teams.map((t) => t.division))].sort();
  const hiddenNote = (rn: number) => {
    const h = rules.rounds.find((r) => r.round === rn)?.hidden;
    return h && !publishedRounds.includes(rn) && !showHidden ? h : null;
  };
  const anyHiddenUnpublished = rounds.some((rn) => hiddenNote(rn));

  const tabs = [...(rules.championship === "combined" ? [{ id: "champ", label: "Championship" }] : []), ...rounds.map((r) => ({ id: `r${r}`, label: `Day ${r}` }))];
  const Name = ({ t }: { t: Team }) => (
    <div className="min-w-0">
      <div className="font-semibold text-foreground break-words">{t.name}</div>
      {t.members.length > 1 && <div className="text-xs text-muted-foreground break-words">{t.members.join(" & ")}</div>}
    </div>
  );
  const th = "px-2 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground";

  const roundBoard = (rn: number, list: Team[]) => {
    const points = isPointsRound(rules, rn);
    const rows = sortRoundBoard(list.map((t) => ({ t, r: byTeamRound.get(t.key)![rn]! })), points);
    return (
      <table className="w-full table-fixed text-sm">
        <thead><tr className="border-b border-border text-left">
          <th className={`${th} w-10`}>Pos</th><th className={th}>Team</th>
          {points ? <><th className={`${th} w-14 text-right`}>Pts</th><th className={`${th} w-12 text-right`}>Thru</th><th className={`${th} w-16 text-right`}>Today Pts</th><th className={`${th} w-16 text-right`}>Total Pts</th></>
            : <><th className={`${th} w-14 text-right`}>To Par</th><th className={`${th} w-12 text-right`}>Thru</th><th className={`${th} w-14 text-right`}>Today</th><th className={`${th} w-14 text-right`}>Total</th></>}
        </tr></thead>
        <tbody>
          {rows.map(({ t, r }, i) => {
            const vis = r.visiblePlayed > 0;
            const thru = r.thru === 0 ? "—" : r.thru === 18 ? "F" : String(r.thru);
            return (
              <tr key={t.key} className="border-b border-border/60 align-top">
                <td className="px-2 py-2 font-semibold">{vis ? i + 1 : "—"}</td>
                <td className="px-2 py-2"><Name t={t} /></td>
                {points ? <>
                  <td className="px-2 py-2 text-right font-bold">{vis ? r.points : "—"}</td>
                  <td className="px-2 py-2 text-right">{thru}</td>
                  <td className="px-2 py-2 text-right">{vis ? r.points : "—"}</td>
                  <td className="px-2 py-2 text-right font-bold">{vis ? r.points : "—"}</td>
                </> : <>
                  <td className="px-2 py-2 text-right font-bold">{vis ? fmtToPar(r.toPar) : "—"}</td>
                  <td className="px-2 py-2 text-right">{thru}</td>
                  <td className="px-2 py-2 text-right">{vis ? fmtToPar(r.toPar) : "—"}</td>
                  <td className="px-2 py-2 text-right font-bold">{vis ? r.strokes : "—"}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const champBoard = (list: Team[]) => {
    const rows = sortChampionship(list.map((t) => ({ item: t, byRound: byTeamRound.get(t.key)! })), rules);
    return (
      <table className="w-full table-fixed text-sm">
        <thead><tr className="border-b border-border text-left">
          <th className={`${th} w-10`}>Pos</th><th className={th}>Team</th>
          {rounds.map((rn) => <th key={rn} className={`${th} w-14 text-right`}>Day {rn}</th>)}
          <th className={`${th} w-14 text-right`}>Total</th>
        </tr></thead>
        <tbody>
          {rows.map((x, i) => {
            const vis = Object.values(x.byRound).some((r) => r && r.visiblePlayed > 0);
            return (
              <tr key={x.item.key} className="border-b border-border/60 align-top">
                <td className="px-2 py-2 font-semibold">{vis ? i + 1 : "—"}</td>
                <td className="px-2 py-2"><Name t={x.item} /></td>
                {rounds.map((rn) => <td key={rn} className="px-2 py-2 text-right">{x.byRound[rn]?.visiblePlayed ? x.byRound[rn]!.bestBallStrokes : "—"}</td>)}
                <td className="px-2 py-2 text-right font-bold">{vis ? championshipTotal(x.byRound) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const rn = tab === "champ" ? null : Number(tab.slice(1));
  const notes = (rn == null ? rounds : [rn]).map((r) => hiddenNote(r)).filter(Boolean) as { from: number; to: number }[];

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {anyHiddenUnpublished && <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provisional - hidden holes not shown</p>}
      {notes.map((h, i) => <p key={i} className="text-center text-sm text-muted-foreground">Holes {rangeLabel(h)} are hidden until results are published.</p>)}
      {teams.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No scores yet.</p>}
      {divisions.map((d) => {
        const list = teams.filter((t) => t.division === d);
        return (
          <div key={d || "all"} className="rounded-lg border border-border bg-card overflow-hidden">
            {d && <div className="px-3 py-2 font-bold text-foreground border-b border-border">{d}</div>}
            {rn == null ? champBoard(list) : roundBoard(rn, list)}
          </div>
        );
      })}
    </div>
  );
}
