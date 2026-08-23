import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import SimpleFlightPayouts from "@/components/payouts/SimpleFlightPayouts";
import MinimumDrivesTracker from "@/components/dashboard/MinimumDrivesTracker";
import ShootoutRoundsEditor from "@/components/dashboard/ShootoutRoundsEditor";
import { assignFlights, threeManScrambleHandicap, THREE_MAN_SCRAMBLE_WEIGHTS, type FlightBasis, type FlightMethod } from "@/lib/flightPayouts";


interface Flight {
  id: string;
  tournament_id: string;
  tier_name: string;
  tier_description: string | null;
  display_order: number;
  is_active: boolean;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  flight_id: string | null;
  handicap: number | null;
  group_number?: number | null;
  tier_id?: string | null;
  status?: string | null;
}

interface RegistrationTier {
  id: string;
  name: string;
  price_cents: number | null;
}

interface Props {
  tournamentId: string;
}

const emptyDraft = { tier_name: "", tier_description: "", display_order: 0, is_active: true };

const divisionKey = (name: string) => name
  .trim()
  .toLowerCase()
  .replace(/\b(divisions?|flights?)\b/g, "")
  .replace(/\bprofessionals?\b/g, "pro")
  .replace(/\bsenior amateurs?\b/g, "senior")
  .replace(/\bamateurs?\b/g, "amateur")
  .replace(/\bjuniors?\b/g, "junior")
  .replace(/\s+/g, " ")
  .trim();


export default function FlightsManager({ tournamentId }: Props) {
  const { toast } = useToast();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);
  const [settings, setSettings] = useState<{ flights_enabled: boolean; flight_method: FlightMethod; flight_based_on: FlightBasis }>({
    flights_enabled: false,
    flight_method: "half",
    flight_based_on: "score",
  });
  const [purseCents, setPurseCents] = useState(0);
  const [scoreTotals, setScoreTotals] = useState<Map<string, number>>(new Map());
  const [scoringFormat, setScoringFormat] = useState<string>("");
  const [teamHcpSaving, setTeamHcpSaving] = useState(false);
  const [regTiers, setRegTiers] = useState<RegistrationTier[]>([]);
  const [syncing, setSyncing] = useState(false);


  const load = useCallback(async () => {
    setLoading(true);
    const [fRes, pRes, tRes, sRes, rtRes] = await Promise.all([
      (supabase as any)
        .from("tournament_tiers")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("display_order", { ascending: true }),
      (supabase as any)
        .from("tournament_registrations")
        .select("id, first_name, last_name, flight_id, handicap, group_number, tier_id, status")
        .eq("tournament_id", tournamentId)
        .order("last_name", { ascending: true }),

      (supabase as any)
        .from("tournaments")
        .select("flights_enabled, flight_method, flight_based_on, scoring_format, registration_fee_cents")
        .eq("id", tournamentId)
        .maybeSingle(),
      (supabase as any)
        .from("tournament_scores")
        .select("registration_id, strokes")
        .eq("tournament_id", tournamentId),
      (supabase as any)
        .from("tournament_registration_tiers")
        .select("id, name, price_cents")
        .eq("tournament_id", tournamentId)
        .order("sort_order", { ascending: true }),
    ]);
    const registrationTiers = (rtRes.data || []) as RegistrationTier[];
    setRegTiers(registrationTiers);
    setFlights(fRes.data || []);
    const rows: Player[] = pRes.data || [];
    setPlayers(rows);
    const tierPriceById = new Map(registrationTiers.map((tier) => [tier.id, tier.price_cents || 0]));
    const baseFeeCents = Number(tRes.data?.registration_fee_cents || 0);
    setPurseCents(rows.reduce((sum, row) => sum + (row.tier_id ? tierPriceById.get(row.tier_id) ?? baseFeeCents : baseFeeCents), 0));
    if (tRes.data) {
      setSettings({
        flights_enabled: !!tRes.data.flights_enabled,
        flight_method: (tRes.data.flight_method as FlightMethod) || "half",
        flight_based_on: (tRes.data.flight_based_on as FlightBasis) || "score",
      });
      setScoringFormat(tRes.data.scoring_format || "");
    }

    const totals = new Map<string, number>();
    for (const s of (sRes.data || []) as { registration_id: string; strokes: number }[]) {
      totals.set(s.registration_id, (totals.get(s.registration_id) || 0) + (s.strokes || 0));
    }
    setScoreTotals(totals);
    setLoading(false);
  }, [tournamentId]);


  const calcTeamHandicaps = async () => {
    setTeamHcpSaving(true);
    try {
      const groups = new Map<number, Player[]>();
      for (const p of players) {
        if (p.group_number == null) continue;
        const arr = groups.get(p.group_number) || [];
        arr.push(p);
        groups.set(p.group_number, arr);
      }
      let updated = 0;
      for (const [, members] of groups) {
        const teamHcp = threeManScrambleHandicap(members.map((m) => m.handicap));
        if (teamHcp == null) continue;
        const { error } = await (supabase as any)
          .from("tournament_registrations")
          .update({ team_handicap: Math.round(teamHcp), team_handicap_percentage: Number(teamHcp.toFixed(2)) })
          .in("id", members.map((m) => m.id));
        if (error) throw error;
        updated += members.length;
      }
      toast({ title: "Team handicaps calculated", description: `${updated} player${updated === 1 ? "" : "s"} updated (${THREE_MAN_SCRAMBLE_WEIGHTS}).` });
      load();
    } catch (e: any) {
      toast({ title: "Could not calculate", description: e.message, variant: "destructive" });
    } finally {
      setTeamHcpSaving(false);
    }
  };

  useEffect(() => {
    if (tournamentId) load();
  }, [tournamentId, load]);


  const openAdd = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft, display_order: flights.length });
    setDialogOpen(true);
  };
  const openEdit = (f: Flight) => {
    setEditingId(f.id);
    setDraft({
      tier_name: f.tier_name,
      tier_description: f.tier_description || "",
      display_order: f.display_order,
      is_active: f.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!draft.tier_name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const payload = {
      tournament_id: tournamentId,
      tier_name: draft.tier_name.trim(),
      tier_description: draft.tier_description.trim() || null,
      display_order: Number(draft.display_order) || 0,
      is_active: draft.is_active,
    };
    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from("tournament_tiers").update(payload).eq("id", editingId));
    } else {
      ({ error } = await (supabase as any).from("tournament_tiers").insert(payload));
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Flight updated" : "Flight created" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this flight? Players will be unassigned.")) return;
    const { error } = await (supabase as any).from("tournament_tiers").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Flight deleted" });
    load();
  };

  const saveFlightSettings = async (s: { flights_enabled: boolean; flight_method: FlightMethod; flight_based_on: FlightBasis }) => {
    const { error } = await (supabase as any).from("tournaments").update(s).eq("id", tournamentId);
    if (error) throw error;
    setSettings(s);
  };

  /** Ranks the field and creates/assigns flights automatically. */
  const applyFlights = async ({ flights: count, names, basedOn }: { flights: number; names: string[]; basedOn: FlightBasis }) => {
    if (players.length === 0) throw new Error("No players in the field yet");

    // remove auto-generated flights from a previous run, keep manual ones
    const existing = flights.filter((f) => names.includes(f.tier_name));
    const toCreate = names.filter((n) => !existing.some((f) => f.tier_name === n));
    if (toCreate.length) {
      const { error } = await (supabase as any).from("tournament_tiers").insert(
        toCreate.map((n, i) => ({
          tournament_id: tournamentId,
          tier_name: n,
          display_order: names.indexOf(n),
          is_active: true,
          tier_description: `Auto-generated flight (${basedOn === "handicap" ? "by handicap" : "by total score"})`,
        })),
      );
      if (error) throw error;
    }

    const { data: allFlights } = await (supabase as any)
      .from("tournament_tiers")
      .select("id, tier_name")
      .eq("tournament_id", tournamentId);
    const idByName = new Map<string, string>((allFlights || []).map((f: any) => [f.tier_name, f.id]));

    const value = (p: Player) =>
      basedOn === "handicap" ? p.handicap ?? null : scoreTotals.get(p.id) ?? null;
    const assigned = assignFlights(players, value, count);

    for (const a of assigned) {
      const flightId = idByName.get(names[a.flightIndex]);
      if (!flightId) continue;
      const { error } = await (supabase as any)
        .from("tournament_registrations")
        .update({ flight_id: flightId })
        .eq("id", a.entry.id);
      if (error) throw error;
    }
    await load();
  };


  /**
   * Pulls the divisions/tiers players picked at registration into tournament
   * flights and assigns every matching player, so the flighted leaderboards
   * stay in sync with Registration Management.
   */
  const syncFromRegistrationDivisions = async () => {
    setSyncing(true);
    try {
      const nameById = new Map(regTiers.map((t) => [t.id, t.name]));
      const usedNames = [...new Set(
        players.map((p) => (p.tier_id ? nameById.get(p.tier_id) : null)).filter((n): n is string => !!n),
      )];
      if (usedNames.length === 0) throw new Error("No registration divisions/tiers found on the roster yet");

      const existingFlightKeys = new Set(flights.map((flight) => divisionKey(flight.tier_name)));
      const missing = usedNames.filter((name) => !existingFlightKeys.has(divisionKey(name)));
      if (missing.length) {
        const { error } = await (supabase as any).from("tournament_tiers").insert(
          missing.map((n, i) => ({
            tournament_id: tournamentId,
            tier_name: n,
            display_order: flights.length + i,
            is_active: true,
            tier_description: "Synced from registration divisions",
          })),
        );
        if (error) throw error;
      }

      const { data: allFlights } = await (supabase as any)
        .from("tournament_tiers")
        .select("id, tier_name")
        .eq("tournament_id", tournamentId);
      const idByDivision = new Map<string, string>((allFlights || []).map((f: any) => [divisionKey(f.tier_name), f.id]));

      let assigned = 0;
      for (const t of regTiers) {
        const flightId = idByDivision.get(divisionKey(t.name));
        const ids = players.filter((p) => p.tier_id === t.id && p.flight_id !== flightId).map((p) => p.id);
        if (!flightId || ids.length === 0) continue;
        const { error } = await (supabase as any)
          .from("tournament_registrations")
          .update({ flight_id: flightId })
          .in("id", ids);
        if (error) throw error;
        assigned += ids.length;
      }
      toast({
        title: "Flights synced",
        description: `${usedNames.length} division${usedNames.length === 1 ? "" : "s"} mapped, ${assigned} player${assigned === 1 ? "" : "s"} assigned.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync once per tournament when the roster has divisions but flights are empty/unassigned.
  const autoSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || syncing || !tournamentId) return;
    if (autoSyncedRef.current === tournamentId) return;
    const needsSync = players.some((p) => p.tier_id && !p.flight_id);
    if (!needsSync) return;
    autoSyncedRef.current = tournamentId;
    void syncFromRegistrationDivisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, syncing, tournamentId, players]);

  const noDivisionPlayers = players.filter((p) => !p.tier_id);


  const assign = async (playerId: string, flightId: string | null) => {
    const { error } = await (supabase as any)
      .from("tournament_registrations")
      .update({ flight_id: flightId })
      .eq("id", playerId);
    if (error) {
      toast({ title: "Assign failed", description: error.message, variant: "destructive" });
      return;
    }
    setPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, flight_id: flightId } : p)));
  };

  const isEligible = (p: Player) => !p.status || p.status === "active";
  /** Only active players count toward flight size and payout math. */
  const countByFlight = (id: string) => players.filter((p) => p.flight_id === id && isEligible(p)).length;
  const membersByFlight = (id: string) =>
    players
      .filter((p) => p.flight_id === id)
      .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`.trim(), status: p.status ?? "active" }));

  if (loading) return <p className="text-sm text-muted-foreground">Loading flights…</p>;

  return (
    <div className="space-y-8">
      <SimpleFlightPayouts
        tournamentId={tournamentId}
        flights={flights.map((f) => ({
          id: f.id,
          name: f.tier_name,
          players: countByFlight(f.id),
          members: membersByFlight(f.id),
        }))}
        defaultPurseCents={purseCents}
        flightMethod={settings.flight_method}
        onSaveMethod={(m: FlightMethod) => saveFlightSettings({ ...settings, flights_enabled: true, flight_method: m })}
        unassignedNames={players.filter((p) => !p.flight_id && isEligible(p)).map((p) => `${p.first_name} ${p.last_name}`)}
        assignedCount={players.filter((p) => p.flight_id && isEligible(p)).length}
        totalPlayers={players.filter(isEligible).length}
        onSync={syncFromRegistrationDivisions}
        syncing={syncing}
        onAddFlight={openAdd}
        onAssignPlayers={() =>
          document.getElementById("custom-flight-editor")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {scoringFormat === "scramble_3" && (
        <>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="font-semibold">3-Person Scramble Team Handicaps</div>
            <p className="text-sm text-muted-foreground">
              Calculates each team's handicap from its group ({THREE_MAN_SCRAMBLE_WEIGHTS}) and saves it to every player in the group.
            </p>
            <Button size="sm" onClick={calcTeamHandicaps} disabled={teamHcpSaving}>
              {teamHcpSaving ? "Calculating…" : "Calculate team handicaps"}
            </Button>
          </div>
          <MinimumDrivesTracker tournamentId={tournamentId} />
        </>
      )}

      {scoringFormat === "shootout" && <ShootoutRoundsEditor tournamentId={tournamentId} />}


      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Tournament Flights</h3>
            <p className="text-sm text-muted-foreground">
              Create competition flights (e.g. Championship, Senior, Ladies, Net). Each flight gets its own leaderboard.
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Flight
          </Button>
        </div>

        {flights.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No flights defined yet. Your tournament will show a single combined leaderboard.
          </div>
        ) : (
          <div className="space-y-2">
            {flights.map((f) => (
              <div key={f.id} className="rounded-lg border border-border p-4 flex items-start justify-between gap-4 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.tier_name}</span>
                    {!f.is_active && <Badge variant="secondary">Inactive</Badge>}
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" /> {countByFlight(f.id)} players
                    </Badge>
                  </div>
                  {f.tier_description && <p className="text-sm text-muted-foreground mt-1">{f.tier_description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {players.length > 0 && (
        <div id="custom-flight-editor">
          <h3 className="text-lg font-semibold mb-1">Custom Flight Editor</h3>

          <p className="text-sm text-muted-foreground mb-4">
            Assign any player to any flight manually. The flighted leaderboard and the payout breakdown above update
            immediately.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Player</th>
                  <th className="px-4 py-2 font-medium w-24 text-right">Hcp</th>
                  <th className="px-4 py-2 font-medium w-24 text-right">Total</th>
                  <th className="px-4 py-2 font-medium w-64">Flight</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{p.handicap ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{scoreTotals.get(p.id) ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Select
                        value={p.flight_id || "__none"}
                        onValueChange={(v) => assign(p.id, v === "__none" ? null : v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Unassigned</SelectItem>
                          {flights.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.tier_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mt-8 mb-1">Flighted Leaderboards (live)</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ranked by total score, lowest first. Players without a score yet are listed last.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {[...flights, { id: "__none", tier_name: "Unassigned", tournament_id: tournamentId, tier_description: null, display_order: 999, is_active: true } as Flight]
              .map((f) => {
                const members = players
                  .filter((p) => (f.id === "__none" ? !p.flight_id : p.flight_id === f.id))
                  .sort((a, b) => {
                    const av = scoreTotals.get(a.id);
                    const bv = scoreTotals.get(b.id);
                    if (av == null && bv == null) return 0;
                    if (av == null) return 1;
                    if (bv == null) return -1;
                    return av - bv;
                  });
                if (members.length === 0) return null;
                return (
                  <div key={f.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{f.tier_name}</span>
                      <Badge variant="outline" className="text-xs">{members.length} players</Badge>
                    </div>
                    <ol className="space-y-1 text-sm">
                      {members.map((p, i) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            <span className="text-muted-foreground mr-2">{i + 1}.</span>
                            {p.first_name} {p.last_name}
                          </span>
                          <span className="font-medium">{scoreTotals.get(p.id) ?? "—"}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
          </div>
        </div>
      )}


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Flight" : "Add Flight"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Flight Name *</Label>
              <Input
                value={draft.tier_name}
                onChange={(e) => setDraft({ ...draft, tier_name: e.target.value })}
                placeholder="Championship"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={draft.tier_description}
                onChange={(e) => setDraft({ ...draft, tier_description: e.target.value })}
                placeholder="For players with handicap 0-10"
                rows={2}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={draft.display_order}
                onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Flight</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
