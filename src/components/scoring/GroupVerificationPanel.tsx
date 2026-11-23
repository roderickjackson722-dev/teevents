import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  canAttest, cardIsAttested, markerForSubject,
  type CardRow, type GroupPlayer, type HoleStatusRow, type VerificationMode,
} from "@/lib/scoreVerification";

export interface VerificationState {
  mode: VerificationMode;
  locked: boolean;
  statuses: HoleStatusRow[];
  cards: CardRow[];
  allAttested: boolean;
}

interface Props {
  tournamentId: string;
  code: string;
  roundNumber: number;
  players: { id: string; first_name: string; last_name: string }[];
  roundComplete: boolean;
  refreshKey: number;
  onState: (s: VerificationState) => void;
}

const label: Record<string, string> = { entered: "Entered - unconfirmed", confirmed: "Confirmed", disputed: "Disputed" };

/** Phone attestation for score verification. Renders nothing when the event has verification Off. */
export function GroupVerificationPanel({ tournamentId, code, roundNumber, players, roundComplete, refreshKey, onState }: Props) {
  const [data, setData] = useState<any>(null);
  const storeKey = `tv-scoring-me:${tournamentId}:${code}`;
  const [me, setMe] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeVal, setDisputeVal] = useState("");
  const [remote, setRemote] = useState(false);

  useEffect(() => { try { setMe(localStorage.getItem(storeKey) || ""); } catch { /* ignore */ } }, [storeKey]);
  const chooseMe = (v: string) => { setMe(v); try { localStorage.setItem(storeKey, v); } catch { /* ignore */ } };

  const load = useCallback(async () => {
    const { data: d, error } = await (supabase as any).rpc("get_group_verification", {
      _tournament_id: tournamentId, _code: code, _round_number: roundNumber,
    });
    if (error || !d) return;
    setData(d);
  }, [tournamentId, code, roundNumber]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    if (!data || data.mode === "off") return;
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [data?.mode, load]);

  const gp: GroupPlayer[] = useMemo(
    () => players.map((p) => ({ id: p.id, teamId: (data?.team_of?.[p.id] as string | null) ?? null })),
    [players, data],
  );
  const overrides = useMemo(() => {
    const o: Record<string, string> = {};
    (data?.markers || []).forEach((m: any) => { o[m.registration_id] = m.marker_registration_id; });
    return o;
  }, [data]);
  const statuses: HoleStatusRow[] = data?.statuses || [];
  const cards: CardRow[] = data?.cards || [];
  const subjects = useMemo(() => {
    const m = new Map<string, string[]>();
    statuses.forEach((s) => m.set(s.subject_key, s.member_ids));
    return [...m.entries()].map(([key, ids]) => ({ key, ids }));
  }, [statuses]);
  const allAttested = subjects.length > 0 && subjects.every((s) => cardIsAttested(cards.find((c) => c.subject_key === s.key)));

  useEffect(() => {
    if (!data) return;
    onState({ mode: data.mode, locked: !!data.locked, statuses, cards, allAttested });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allAttested]);

  if (!data || data.mode === "off") return null;

  const name = (id: string) => { const p = players.find((x) => x.id === id); return p ? `${p.first_name} ${p.last_name}` : "Player"; };
  const subjectName = (ids: string[]) => ids.length > 1 ? ids.map((i) => name(i).split(" ")[0]).join(" & ") : name(ids[0]!);
  const markerOf = (ids: string[]) => markerForSubject(ids, gp, overrides);
  const iMark = players.filter((p) => p.id !== me && markerOf([p.id]) === me);
  const myPending = me ? statuses.filter((s) => s.status === "entered" && markerOf(s.member_ids) === me && canAttest(me, s.member_ids, gp)) : [];
  const disputed = statuses.filter((s) => s.status === "disputed");
  const resolved = statuses.filter((s) => s.resolved_at);

  const confirm = async (s: HoleStatusRow, agree: boolean, strokes?: number) => {
    setBusy(`${s.subject_key}:${s.hole}`);
    const { error } = await (supabase as any).rpc("confirm_hole_score", {
      _tournament_id: tournamentId, _code: code, _round_number: roundNumber, _group_number: null,
      _hole_number: s.hole, _subject_key: s.subject_key, _actor_registration_id: me, _agree: agree, _strokes: strokes ?? null,
    });
    setBusy(null); setDisputeFor(null); setDisputeVal("");
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: agree ? "Confirmed" : "Marked as disputed", description: agree ? undefined : "The organizer has been notified. Keep playing." });
    load();
  };

  const sign = async (subjectKey: string, step: "player" | "marker") => {
    setBusy(`card:${subjectKey}:${step}`);
    const { error } = await (supabase as any).rpc("sign_score_card", {
      _tournament_id: tournamentId, _code: code, _round_number: roundNumber, _group_number: null,
      _subject_key: subjectKey, _actor_registration_id: me, _step: step, _remote: remote,
    });
    setBusy(null);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Score verification · {data.mode === "strict" ? "Strict" : "Standard"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {data.locked && <p className="text-xs text-muted-foreground">This round is locked by the organizer.</p>}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Who is using this phone?</label>
          <Select value={me} onValueChange={chooseMe}>
            <SelectTrigger><SelectValue placeholder="Choose your name" /></SelectTrigger>
            <SelectContent>
              {players.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {me && (
          <p className="font-medium text-foreground">
            {iMark.length > 0 ? `You are marking ${iMark.map((p) => `${p.first_name} ${p.last_name}`).join(", ")}` : "You are not marking anyone in this group."}
          </p>
        )}

        {myPending.map((s) => {
          const k = `${s.subject_key}:${s.hole}`;
          return (
            <div key={k} className="rounded border border-border p-2 space-y-2">
              <Button variant="outline" className="w-full h-auto py-2 whitespace-normal" disabled={busy === k || data.locked} onClick={() => confirm(s, true)}>
                Confirm {s.entered} on Hole {s.hole} - {subjectName(s.member_ids)}
              </Button>
              {disputeFor === k ? (
                <div className="flex gap-2">
                  <Input type="number" inputMode="numeric" min={1} max={20} placeholder="Correct score" value={disputeVal} onChange={(e) => setDisputeVal(e.target.value)} />
                  <Button variant="outline" disabled={busy === k} onClick={() => {
                    const n = parseInt(disputeVal, 10);
                    if (!disputeVal) return confirm(s, false);
                    if (isNaN(n) || n < 1 || n > 20) return;
                    confirm(s, n === s.entered, n);
                  }}>Send</Button>
                </div>
              ) : (
                <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setDisputeFor(k)}>That's not right</button>
              )}
            </div>
          );
        })}

        {disputed.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-destructive">Disputed holes (under organizer review — keep playing)</p>
            {disputed.map((s) => (
              <div key={`${s.subject_key}:${s.hole}`} className="grid grid-cols-3 gap-2 text-xs rounded border border-destructive/40 p-2">
                <span>Hole {s.hole} · {subjectName(s.member_ids)}</span>
                <span>Scorer: <b>{s.entered ?? "—"}</b></span>
                <span>Marker: <b>{s.marker ?? "not given"}</b></span>
              </div>
            ))}
          </div>
        )}
        {resolved.length > 0 && (
          <div className="space-y-1">
            {resolved.map((s) => (
              <p key={`r${s.subject_key}:${s.hole}`} className="text-xs text-muted-foreground">
                Organizer set Hole {s.hole} for {subjectName(s.member_ids)} to {s.entered}{s.resolution_reason ? ` — ${s.resolution_reason}` : ""}.
              </p>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Hole status</p>
          {subjects.map((sub) => (
            <div key={sub.key} className="flex flex-wrap items-center gap-1 text-xs">
              <span className="w-24 truncate font-medium">{subjectName(sub.ids)}</span>
              {Array.from({ length: 18 }, (_, i) => i + 1).map((h) => {
                const r = statuses.find((s) => s.subject_key === sub.key && s.hole === h);
                const cls = !r ? "bg-muted/40 text-muted-foreground" : r.status === "confirmed" ? "bg-primary/20 text-foreground" : r.status === "disputed" ? "bg-destructive/20 text-destructive" : "bg-accent/40 text-foreground";
                return <span key={h} title={r ? label[r.status] : "Not played / no score"} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center ${cls}`}>{h}</span>;
              })}
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Green: Confirmed · Yellow: Entered - unconfirmed · Red: Disputed · Grey: Not played / no score</p>
        </div>

        {roundComplete && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="font-semibold">Scorecard Summary</p>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={remote} onCheckedChange={(v) => setRemote(!!v)} /> I have left the course (attesting remotely)
            </label>
            {subjects.map((sub) => {
              const c = cards.find((x) => x.subject_key === sub.key);
              const marker = markerOf(sub.ids);
              const isMine = !!me && sub.ids.includes(me);
              const iAmMarker = !!me && marker === me && canAttest(me, sub.ids, gp);
              return (
                <div key={sub.key} className="rounded border border-border p-2 space-y-1">
                  <p className="font-medium">{subjectName(sub.ids)}</p>
                  <p className="text-xs text-muted-foreground">
                    {c?.player_ok_at ? "Player confirmed" : "Waiting for player"} · {c?.attested_at ? (c.attested_remote ? "Attested remotely" : "Attested on site") : `Waiting for ${marker ? name(marker) : "organizer"}`}
                  </p>
                  {isMine && !c?.player_ok_at && (
                    <Button variant="outline" size="sm" disabled={!!busy || data.locked} onClick={() => sign(sub.key, "player")}>My card is correct</Button>
                  )}
                  {iAmMarker && c?.player_ok_at && !c?.attested_at && (
                    <Button variant="outline" size="sm" disabled={!!busy || data.locked} onClick={() => sign(sub.key, "marker")}>I attest {subjectName(sub.ids)}'s card</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
