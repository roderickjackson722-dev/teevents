import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { assignMarkers, cardStatus, type CardRow, type HoleStatusRow } from "@/lib/scoreVerification";

interface Reg { id: string; first_name: string | null; last_name: string | null; group_number: number | null; group_id: string | null }

/** Organizer close-out for score verification: group status, dispute queue, card actions, lock then publish. */
export default function ScoreVerificationCloseOut({ tournamentId }: { tournamentId: string }) {
  const [mode, setMode] = useState<string>("off");
  const [round, setRound] = useState(1);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [roundStatus, setRoundStatus] = useState<any>(null);
  const [fix, setFix] = useState<Record<string, { strokes: string; reason: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase as any;
    const { data: t } = await sb.from("tournaments").select("score_verification").eq("id", tournamentId).maybeSingle();
    setMode(t?.score_verification || "off");
    if (!t || t.score_verification === "off") return;
    const [r, s, c, m, rs] = await Promise.all([
      sb.from("tournament_registrations").select("id, first_name, last_name, group_number, group_id, status").eq("tournament_id", tournamentId),
      sb.from("score_hole_status").select("*").eq("tournament_id", tournamentId).eq("round_number", round),
      sb.from("score_cards").select("*").eq("tournament_id", tournamentId).eq("round_number", round),
      sb.from("score_markers").select("*").eq("tournament_id", tournamentId).eq("round_number", round),
      sb.from("score_round_status").select("*").eq("tournament_id", tournamentId).eq("round_number", round).maybeSingle(),
    ]);
    setRegs((r.data || []).filter((x: any) => (x.status ?? "active") !== "wd"));
    setRows(s.data || []); setCards(c.data || []); setMarkers(m.data || []); setRoundStatus(rs.data || null);
  }, [tournamentId, round]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (mode === "off") return; const t = setInterval(load, 10000); return () => clearInterval(t); }, [mode, load]);

  const name = (id?: string | null) => { const p = regs.find((x) => x.id === id); return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "—"; };
  const groups = useMemo(() => {
    const g = new Map<number, Reg[]>();
    regs.forEach((r) => { if (r.group_number != null) g.set(r.group_number, [...(g.get(r.group_number) || []), r]); });
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [regs]);

  if (mode === "off") return null;

  const call = async (key: string, fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(key);
    const { error } = await (supabase as any).rpc(fn, args);
    setBusy(null);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: ok }); load();
  };
  const toRow = (x: any): HoleStatusRow => ({ hole: x.hole_number, subject_key: x.subject_key, member_ids: x.member_ids, status: x.status, entered: x.entered_strokes, marker: x.marker_strokes });
  const disputed = rows.filter((x) => x.status === "disputed");
  const unconfirmed = rows.filter((x) => x.status === "entered");
  const locked = !!roundStatus?.locked_at;
  const published = !!roundStatus?.published_at;
  const subjName = (ids: string[]) => ids.map((i) => name(i)).join(" & ");
  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <span>Score verification close-out · {mode === "strict" ? "Strict" : "Standard"}</span>
          <span className="flex items-center gap-2 text-sm font-normal">
            Round
            <Input type="number" min={1} max={8} value={round} onChange={(e) => setRound(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1)))} className="w-16 h-8" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={published ? "default" : "outline"}>{published ? `Published ${fmt(roundStatus.published_at)}` : locked ? `Locked ${fmt(roundStatus.locked_at)}` : "Open — provisional"}</Badge>
          {!locked && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => call("lock", "org_round_action", { _tournament_id: tournamentId, _round_number: round, _action: "lock" }, "Round locked")}>Attest All / Lock round</Button>}
          {(locked || published) && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => { if (confirm("Reopen this round? Player editing returns and results become provisional again.")) call("reopen", "org_round_action", { _tournament_id: tournamentId, _round_number: round, _action: "reopen" }, "Round reopened"); }}>Reopen round</Button>}
          {locked && !published && (
            <Button size="sm" disabled={!!busy || disputed.length > 0} style={{ backgroundColor: "#F5A623", color: "#1a5c38" }}
              onClick={() => call("publish", "org_round_action", { _tournament_id: tournamentId, _round_number: round, _action: "publish" }, "Results published")}>
              Publish Results
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Step 1 locks player editing. Step 2 publishes results. Only published scores count for prizes; results are never published automatically.</p>

        <div className="space-y-2">
          <p className="font-semibold">Dispute queue ({disputed.length})</p>
          {disputed.length === 0 && <p className="text-xs text-muted-foreground">No disputed holes.</p>}
          {disputed.map((x) => {
            const k = `${x.subject_key}:${x.hole_number}`;
            const f = fix[k] || { strokes: "", reason: "" };
            return (
              <div key={k} className="rounded border border-destructive/40 p-3 space-y-2">
                <p className="font-medium">Hole {x.hole_number} · {subjName(x.member_ids)}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <span>Scorer entered <b>{x.entered_strokes}</b> · {fmt(x.entered_at)}{x.organizer_entered ? " (organizer-entered)" : ""}</span>
                  <span>{name(x.confirmed_by_registration)} (marker) says <b>{x.marker_strokes ?? "not right, no number given"}</b></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFix((p) => ({ ...p, [k]: { ...f, strokes: String(x.entered_strokes) } }))}>Use {x.entered_strokes}</Button>
                  {x.marker_strokes != null && <Button variant="outline" size="sm" onClick={() => setFix((p) => ({ ...p, [k]: { ...f, strokes: String(x.marker_strokes) } }))}>Use {x.marker_strokes}</Button>}
                  <Input className="w-20 h-8" type="number" min={1} max={20} placeholder="Score" value={f.strokes} onChange={(e) => setFix((p) => ({ ...p, [k]: { ...f, strokes: e.target.value } }))} />
                  <Input className="flex-1 min-w-[10rem] h-8" placeholder="Why (required)" value={f.reason} onChange={(e) => setFix((p) => ({ ...p, [k]: { ...f, reason: e.target.value } }))} />
                  <Button variant="outline" size="sm" disabled={!!busy || !f.strokes || !f.reason.trim()}
                    onClick={() => call(k, "org_resolve_hole", { _tournament_id: tournamentId, _round_number: round, _hole_number: x.hole_number, _subject_key: x.subject_key, _strokes: parseInt(f.strokes, 10), _reason: f.reason.trim() }, "Dispute resolved — players see the decision in the app")}>
                    Save decision
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {unconfirmed.length > 0 && (
          <details className="rounded border border-border p-3">
            <summary className="cursor-pointer font-semibold">Entered - unconfirmed holes ({unconfirmed.length}) — enter the second entry for a player whose phone died</summary>
            <div className="mt-2 space-y-1">
              {unconfirmed.map((x) => (
                <div key={`${x.subject_key}:${x.hole_number}`} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex-1">Hole {x.hole_number} · {subjName(x.member_ids)} · {x.entered_strokes}</span>
                  <Button variant="ghost" size="sm" disabled={!!busy}
                    onClick={() => call(`c${x.subject_key}${x.hole_number}`, "org_resolve_hole", { _tournament_id: tournamentId, _round_number: round, _hole_number: x.hole_number, _subject_key: x.subject_key, _strokes: x.entered_strokes, _reason: "organizer-entered confirmation" }, "Confirmed (organizer-entered)")}>
                    Confirm {x.entered_strokes} (organizer-entered)
                  </Button>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="space-y-3">
          <p className="font-semibold">Groups</p>
          {groups.length === 0 && <p className="text-xs text-muted-foreground">No groups assigned yet.</p>}
          {groups.map(([g, members]) => {
            const ids = members.map((m) => m.id);
            const gRows = rows.filter((x) => (x.member_ids as string[]).some((i) => ids.includes(i)));
            const holes = new Set(gRows.map((x) => x.hole_number)).size;
            const subjects = new Map<string, string[]>();
            gRows.forEach((x) => subjects.set(x.subject_key, x.member_ids));
            if (subjects.size === 0) members.forEach((m) => subjects.set(m.id, [m.id]));
            const ov: Record<string, string> = {}; markers.forEach((m) => { ov[m.registration_id] = m.marker_registration_id; });
            const auto = assignMarkers(members.map((m) => ({ id: m.id, teamId: m.group_id })), ov);
            return (
              <div key={g} className="rounded border border-border p-3 space-y-2">
                <p className="font-medium">Group {g} · {holes} of 18 holes completed</p>
                {[...subjects.entries()].map(([key, mids]) => {
                  const c = cards.find((x) => x.subject_key === key) as CardRow | undefined;
                  const st = c?.player_state === "dq" ? "Disqualified" : c?.player_state === "wd" ? "Withdrawn" : cardStatus(gRows.filter((x) => x.subject_key === key).map(toRow), c);
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="flex-1 min-w-[8rem] font-medium">{subjName(mids)}</span>
                      <Badge variant={st === "Disputed" ? "destructive" : "outline"}>{st}{c?.attested_remote ? " · Attested remotely" : ""}{c?.force_attested_by ? " · Force-attested" : ""}</Badge>
                      <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => call(`f${key}`, "org_card_action", { _tournament_id: tournamentId, _round_number: round, _subject_key: key, _member_ids: mids, _action: "force_attest" }, "Card force-attested")}>Force-attest</Button>
                      <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => call(`w${key}`, "org_card_action", { _tournament_id: tournamentId, _round_number: round, _subject_key: key, _member_ids: mids, _action: "wd" }, "Marked withdrawn")}>Withdraw</Button>
                      <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => { if (confirm("Disqualify this card?")) call(`d${key}`, "org_card_action", { _tournament_id: tournamentId, _round_number: round, _subject_key: key, _member_ids: mids, _action: "dq" }, "Marked disqualified"); }}>Disqualify</Button>
                      {(c?.player_state || c?.force_attested_by) && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => call(`r${key}`, "org_card_action", { _tournament_id: tournamentId, _round_number: round, _subject_key: key, _member_ids: mids, _action: "reinstate" }, "Card reinstated")}>Undo</Button>}
                    </div>
                  );
                })}
                {holes === 0 && (
                  <div className="space-y-1 pt-1">
                    <p className="text-xs text-muted-foreground">Markers (change before the round starts)</p>
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <span className="w-32 truncate">{name(m.id)} is marked by</span>
                        <Select value={auto[m.id] ?? ""} onValueChange={(v) => call(`m${m.id}`, "org_set_marker", { _tournament_id: tournamentId, _round_number: round, _registration_id: m.id, _marker_registration_id: v }, "Marker updated")}>
                          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="No marker available" /></SelectTrigger>
                          <SelectContent>
                            {members.filter((o) => o.id !== m.id && !(m.group_id && o.group_id === m.group_id)).map((o) => <SelectItem key={o.id} value={o.id}>{name(o.id)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">A paper scorecard stays the backup for any group whose phones fail.</p>
      </CardContent>
    </Card>
  );
}
