import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Users, Trash2, Copy, Mail, Trophy, Pencil, Check, X } from "lucide-react";
import LeagueTeamLeaderboard from "@/components/leagues/LeagueTeamLeaderboard";

interface Member {
  id: string;
  member_name: string;
  email: string;
  handicap_index: number | null;
}

interface Pairing {
  id: string;
  team_name: string;
  scoring_code: string;
  player1_id: string | null;
  player2_id: string | null;
  holes: number;
}

export default function LeagueTeamsTab({ leagueId }: { leagueId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [holes, setHoles] = useState<number>(18);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [recipients, setRecipients] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  const event = events.find((e) => e.id === eventId);

  useEffect(() => {
    (async () => {
      const [{ data: ev }, { data: ms }] = await Promise.all([
        (supabase as any).from("league_events").select("id, event_name, event_date, format_type, holes, course_name").eq("league_id", leagueId).order("event_date"),
        (supabase as any).from("league_members").select("id, member_name, email, handicap_index").eq("league_id", leagueId).order("member_name"),
      ]);
      setEvents(ev || []);
      setMembers(ms || []);
      if (ev?.[0]) {
        setEventId(ev[0].id);
        setHoles(ev[0].holes === 9 ? 9 : 18);
      }
      setLoading(false);
    })();
  }, [leagueId]);

  const loadPairings = async (evId: string) => {
    if (!evId) { setPairings([]); return; }
    const { data } = await (supabase as any)
      .from("league_team_pairings")
      .select("id, team_name, scoring_code, player1_id, player2_id, holes")
      .eq("event_id", evId)
      .order("created_at");
    setPairings(data || []);
  };

  useEffect(() => {
    loadPairings(eventId);
    const ev = events.find((e) => e.id === eventId);
    if (ev) setHoles(ev.holes === 9 ? 9 : 18);
  }, [eventId, events.length]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const pairedIds = useMemo(() => {
    const s = new Set<string>();
    pairings.forEach((p) => { if (p.player1_id) s.add(p.player1_id); if (p.player2_id) s.add(p.player2_id); });
    return s;
  }, [pairings]);

  const filtered = members.filter((m) =>
    !search.trim() ||
    m.member_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const createTeam = async () => {
    if (!eventId) return toast({ title: "Choose an event first", variant: "destructive" });
    if (!teamName.trim()) return toast({ title: "Team name is required", variant: "destructive" });
    if (selected.length !== 2) return toast({ title: "Select exactly two players", variant: "destructive" });
    setSaving(true);
    const { data: code, error: cErr } = await (supabase as any).rpc("generate_league_team_scoring_code");
    if (cErr || !code) {
      setSaving(false);
      return toast({ title: "Could not generate code", description: cErr?.message, variant: "destructive" });
    }
    const { error } = await (supabase as any).from("league_team_pairings").insert({
      league_id: leagueId,
      event_id: eventId,
      team_name: teamName.trim(),
      scoring_code: code,
      player1_id: selected[0],
      player2_id: selected[1],
      holes,
    });
    setSaving(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: `Team created — scoring code ${code}` });
    setTeamName("");
    setSelected([]);
    loadPairings(eventId);
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Delete this team and its scores?")) return;
    const { error } = await (supabase as any).from("league_team_pairings").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    loadPairings(eventId);
  };

  const saveName = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await (supabase as any).from("league_team_pairings").update({ team_name: editName.trim() }).eq("id", id);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    setEditingId(null);
    loadPairings(eventId);
  };

  const codeRows = pairings.flatMap((p) =>
    [p.player1_id, p.player2_id]
      .filter(Boolean)
      .map((mid) => ({ pairing: p, member: memberById.get(mid as string) }))
      .filter((r) => r.member)
  );

  const copyAll = async () => {
    const text = pairings
      .map((p) => {
        const names = [p.player1_id, p.player2_id].map((id) => memberById.get(id || "")?.member_name).filter(Boolean).join(", ");
        return `${p.team_name} — ${p.scoring_code} (${p.holes} holes) — ${names}`;
      })
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Codes copied" });
  };

  const sendCodes = async () => {
    const ids = Object.entries(recipients).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return toast({ title: "Select at least one player", variant: "destructive" });
    setSending(true);
    const { data, error } = await (supabase as any).functions.invoke("send-league-scoring-codes", {
      body: { event_id: eventId, member_ids: ids },
    });
    setSending(false);
    if (error || data?.error) {
      return toast({ title: "Send failed", description: error?.message || data?.error, variant: "destructive" });
    }
    const sent = data?.sent ?? 0;
    const failures = (data?.results || []).filter((r: any) => !r.ok);
    if (sent === 0) {
      return toast({
        title: "No emails sent",
        description: failures[0]?.error ? String(failures[0].error).slice(0, 200) : "No players with a valid email address.",
        variant: "destructive",
      });
    }
    toast({
      title: `Sent ${sent} scoring code email${sent === 1 ? "" : "s"}`,
      description: failures.length ? `${failures.length} failed to send.` : undefined,
    });
  };

  const leaderboardUrl = eventId ? `${window.location.origin}/league-leaderboard/${eventId}` : "";

  const copyLeaderboardLink = async () => {
    await navigator.clipboard.writeText(leaderboardUrl);
    toast({ title: "Leaderboard link copied" });
  };

  const sendLeaderboard = async () => {
    if (!eventId) return;
    const emails = Object.entries(boardRecipients)
      .filter(([, v]) => v)
      .map(([id]) => memberById.get(id)?.email)
      .filter(Boolean) as string[];
    const extra = extraEmails.split(/[,\s;]+/).map((e) => e.trim()).filter(Boolean);
    const all = Array.from(new Set([...emails, ...extra]));
    if (all.length === 0) return toast({ title: "Select at least one recipient", variant: "destructive" });
    setSendingBoard(true);
    try {
      const res = await sendLeaderboardLink({ data: { eventId, emails: all, message: boardMessage.trim() || undefined } });
      const sent = res?.sent ?? 0;
      if (sent === 0) {
        toast({ title: "No emails sent", description: "The email service rejected the request.", variant: "destructive" });
      } else {
        toast({ title: `Leaderboard link sent to ${sent} recipient${sent === 1 ? "" : "s"}` });
      }
    } catch (e: any) {
      toast({ title: "Send failed", description: e?.message || String(e), variant: "destructive" });
    }
    setSendingBoard(false);
  };


  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label>Event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose an event" /></SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.event_name} — {e.event_date} ({e.holes === 9 ? "9" : "18"} holes)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {events.length === 0 && <p className="text-sm text-muted-foreground">Create an event first on the Events tab.</p>}
        </CardContent>
      </Card>

      {/* Part 1 — league players */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> League Players ({members.length})</h2>
            <Input className="max-w-xs" placeholder="Search players…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Handicap</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.member_name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="text-right">{m.handicap_index ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {pairedIds.has(m.id) ? (
                        <Badge variant="secondary">Paired</Badge>
                      ) : (
                        <Button size="sm" variant={selected.includes(m.id) ? "default" : "outline"} onClick={() => toggleSelect(m.id)}>
                          {selected.includes(m.id) ? "Selected" : "Select"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No players found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Part 2 — create team */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-lg font-semibold">Create Team{event ? ` — ${event.event_name}` : ""}</h2>
          <div className="max-w-md">
            <Label>Team Name</Label>
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team Mulligan" />
          </div>
          <div>
            <Label>Select Players (exactly 2)</Label>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border divide-y">
              {filtered.map((m) => (
                <label key={m.id} className={`flex items-center gap-3 p-2 text-sm ${pairedIds.has(m.id) ? "opacity-50" : "cursor-pointer"}`}>
                  <Checkbox
                    checked={selected.includes(m.id)}
                    disabled={pairedIds.has(m.id)}
                    onCheckedChange={() => toggleSelect(m.id)}
                  />
                  <span className="font-medium">{m.member_name}</span>
                  <span className="text-muted-foreground">(Handicap: {m.handicap_index ?? "—"})</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Number of Holes</Label>
            <Select value={String(holes)} onValueChange={(v) => setHoles(Number(v))}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="18">18 holes</SelectItem>
                <SelectItem value="9">9 holes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createTeam} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create Team
          </Button>
        </CardContent>
      </Card>

      {/* Teams list */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="text-lg font-semibold">Teams ({pairings.length})</h2>
          {pairings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No teams paired yet.</p>
          ) : (
            pairings.map((p) => {
              const names = [p.player1_id, p.player2_id].map((id) => memberById.get(id || "")?.member_name).filter(Boolean).join(", ");
              return (
                <div key={p.id} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 max-w-[220px]" />
                        <Button size="sm" variant="ghost" onClick={() => saveName(p.id)}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <p className="font-semibold">
                        {p.team_name}{" "}
                        <span className="font-mono text-sm text-muted-foreground">(Scoring Code: {p.scoring_code})</span>
                      </p>
                    )}
                    <div className="flex gap-1">
                      {editingId !== p.id && (
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(p.id); setEditName(p.team_name); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeTeam(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Players: {names || "—"}</p>
                  <p className="text-sm text-muted-foreground">Format: {p.holes} holes</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Part 3 & 5 — scoring codes + send */}
      {pairings.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Scoring Codes</h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Scoring Code</TableHead>
                    <TableHead>Holes</TableHead>
                    <TableHead>Players</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairings.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.team_name}</TableCell>
                      <TableCell className="font-mono">{p.scoring_code}</TableCell>
                      <TableCell>{p.holes}</TableCell>
                      <TableCell>{[p.player1_id, p.player2_id].map((id) => memberById.get(id || "")?.member_name).filter(Boolean).join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="font-medium">Send Scoring Codes</p>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={codeRows.length > 0 && codeRows.every((r) => recipients[r.member!.id])}
                    onCheckedChange={(v) => {
                      const next: Record<string, boolean> = {};
                      codeRows.forEach((r) => { next[r.member!.id] = !!v; });
                      setRecipients(next);
                    }}
                  />
                  Select All
                </label>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y">
                {codeRows.map((r) => (
                  <label key={r.member!.id} className="flex items-center gap-3 py-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={!!recipients[r.member!.id]}
                      onCheckedChange={(v) => setRecipients((prev) => ({ ...prev, [r.member!.id]: !!v }))}
                    />
                    <span className="font-medium">{r.member!.member_name}</span>
                    <span className="text-muted-foreground">({r.member!.email})</span>
                    <span className="ml-auto font-mono">Code: {r.pairing.scoring_code}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap pt-1">
                <Button onClick={sendCodes} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />} Send Email
                </Button>
                <Button variant="outline" onClick={copyAll}><Copy className="h-4 w-4 mr-2" /> Copy All Codes</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Part 4 — leaderboard */}
      {eventId && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5" /> Event Leaderboard
            </h2>
            <LeagueTeamLeaderboard eventId={eventId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
