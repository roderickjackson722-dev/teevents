import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import SpreadsheetImportPanel, { type ImportedPlayer } from "@/components/enterprise/SpreadsheetImportPanel";
import PairingsBoard, { type PairingGroup, type PairingPlayer } from "@/components/enterprise/PairingsBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  HelpCircle,
  Loader2,
  Plus,
  Rocket,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  ENTERPRISE_GAME_TYPES,
  ENTERPRISE_EVENT_TYPES,
  defaultEnterpriseSettings,
  eventTypeLabel,
  gameTypeLabel,
  parseEnterpriseSettings,
  type EnterpriseSettings,
} from "@/lib/enterprise";
import { parsePairingsConfig } from "@/lib/pairingsConfig";

const STEPS = ["Event Info", "Player Details", "Add Players", "Pairings & Groups", "Complete"];
const LETTERS = ["A", "B", "C"];

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  handicap_index: number | null;
  group_number: number | null;
  group_position: number | null;
  group_label: string | null;
}

const tbdEmail = () => `tbd-${Math.random().toString(36).slice(2, 10)}@placeholder.teevents.golf`;

const Hint = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="ml-1 inline h-3.5 w-3.5 cursor-help text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent className="max-w-64 text-xs">{text}</TooltipContent>
  </Tooltip>
);

export default function EnterpriseCreate() {
  const { org } = useOrgContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const eventType = params.get("type") || "single_round";
  const tournamentId = params.get("tournament_id");

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(tournamentId);
  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [status, setStatus] = useState("draft");
  const [slug, setSlug] = useState<string | null>(null);
  const [settings, setSettings] = useState<EnterpriseSettings>(defaultEnterpriseSettings());
  const [courses, setCourses] = useState<{ id: string; course_name: string }[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterPicked, setRosterPicked] = useState<string[]>([]);
  const [manual, setManual] = useState({ first_name: "", last_name: "", handicap: "", email: "", phone: "" });
  const [groups, setGroups] = useState<PairingGroup[]>([]);
  const [unassigned, setUnassigned] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const update = (patch: Partial<EnterpriseSettings>) => setSettings((s) => ({ ...s, ...patch }));

  /* ---------------- load ---------------- */
  useEffect(() => {
    (async () => {
      const { data: courseRows } = await supabase
        .from("course_database")
        .select("id, course_name")
        .order("course_name")
        .limit(300);
      setCourses((courseRows || []) as any);

      if (!tournamentId) { setLoading(false); return; }
      const { data } = await (supabase.from("tournaments") as any)
        .select("id, title, date, course_name, status, slug, enterprise_settings, enterprise_event_type, max_players, registration_fee_cents")
        .eq("id", tournamentId)
        .maybeSingle();
      if (data) {
        setId(data.id);
        setTitle(data.title || "");
        setCourseName(data.course_name || "");
        setDate((data.date || "").slice(0, 10));
        setStatus(data.status || "draft");
        setSlug(data.slug || null);
        const parsed = parseEnterpriseSettings(data.enterprise_settings);
        setSettings(parsed);
        setStep(Math.min(4, parsed.wizardStep || 0));
        setTime(parsed.rounds[0]?.time || "08:00");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (!org) return;
    (supabase.from("enterprise_roster") as any)
      .select("id, first_name, last_name, email, phone, handicap_index")
      .eq("organization_id", org.orgId)
      .eq("is_active", true)
      .order("last_name")
      .then(({ data }: any) => setRoster(data || []));
  }, [org]);

  const loadPlayers = useCallback(async (eventId: string) => {
    const { data } = await (supabase.from("tournament_registrations") as any)
      .select("id, first_name, last_name, email, phone, handicap_index, group_number, group_position, group_label")
      .eq("tournament_id", eventId)
      .order("last_name");
    setPlayers((data || []) as PlayerRow[]);
  }, []);

  useEffect(() => { if (id) loadPlayers(id); }, [id, loadPlayers]);

  /* ---------------- save ---------------- */
  const persist = async (extra: Partial<Record<string, unknown>> = {}, nextSettings = settings): Promise<string | null> => {
    if (!org) return null;
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: title.trim() || "Untitled Event",
      course_name: courseName || null,
      date: date || null,
      scoring_format: nextSettings.gameType,
      skins_enabled: nextSettings.skinsGross || nextSettings.skinsNet,
      skins_mode: nextSettings.skinsNet && !nextSettings.skinsGross ? "net" : "gross",
      max_group_size: nextSettings.playersPerTeam,
      scoring_rounds: Math.max(1, nextSettings.rounds.length),
      enterprise_settings: nextSettings as unknown as Record<string, unknown>,
      enterprise_event_type: eventType,
      is_enterprise: true,
      ...extra,
    };

    if (id) {
      const { error } = await (supabase.from("tournaments") as any).update(payload).eq("id", id);
      setSaving(false);
      if (error) { toast.error(error.message); return null; }
      return id;
    }

    const { data, error } = await (supabase.from("tournaments") as any)
      .insert({ ...payload, organization_id: org.orgId, status: "draft" })
      .select("id, slug")
      .maybeSingle();
    setSaving(false);
    if (error || !data?.id) { toast.error(error?.message || "Could not save this event."); return null; }
    setId(data.id);
    setSlug(data.slug || null);
    const next = new URLSearchParams(params);
    next.set("tournament_id", data.id);
    setParams(next, { replace: true });
    return data.id;
  };

  /* ---------------- players ---------------- */
  const addPlayers = async (rows: { first_name: string; last_name: string; email?: string; phone?: string; handicap_index?: number | null }[]) => {
    const eventId = id || (await persist());
    if (!eventId) return;
    const payload = rows.map((r) => ({
      tournament_id: eventId,
      first_name: r.first_name || "TBD",
      last_name: r.last_name || "",
      email: r.email?.trim() || tbdEmail(),
      phone: r.phone || null,
      handicap_index: r.handicap_index ?? null,
      handicap: r.handicap_index ?? null,
      payment_status: "unpaid",
    }));
    const { error } = await (supabase.from("tournament_registrations") as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(`${payload.length} ${payload.length === 1 ? "player" : "players"} added.`);
    loadPlayers(eventId);
  };

  const removePlayer = async (playerId: string) => {
    await supabase.from("tournament_registrations").delete().eq("id", playerId);
    setPlayers((p) => p.filter((x) => x.id !== playerId));
  };

  const importFromSheet = (rows: ImportedPlayer[]) =>
    addPlayers(rows.map((r) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      handicap_index: r.handicap_index ?? null,
    })));

  /* ---------------- pairings ---------------- */
  const pairingPlayers: PairingPlayer[] = useMemo(
    () => players.map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      handicap: p.handicap_index,
    })),
    [players],
  );

  useEffect(() => {
    if (step !== 3 || !players.length) return;
    setGroups((prev) => {
      if (prev.length) return prev;
      const built = new Map<number, PairingGroup>();
      players.forEach((p) => {
        if (p.group_number == null) return;
        const g = built.get(p.group_number) || { number: p.group_number, hole: p.group_label || String(p.group_number), playerIds: [] };
        g.playerIds.push(p.id);
        built.set(p.group_number, g);
      });
      const list = [...built.values()].sort((a, b) => a.number - b.number);
      const assigned = new Set(list.flatMap((g) => g.playerIds));
      setUnassigned(players.filter((p) => !assigned.has(p.id)).map((p) => p.id));
      return list;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, players]);

  const autoAssign = (mode: "handicap" | "random") => {
    const per = settings.pairings.playersPerPairing;
    const perHole = Math.max(1, settings.pairings.groupsPerHole);
    const ordered = [...pairingPlayers];
    if (mode === "handicap") ordered.sort((a, b) => (a.handicap ?? 99) - (b.handicap ?? 99));
    else ordered.sort(() => Math.random() - 0.5);

    const next: PairingGroup[] = [];
    for (let i = 0; i < ordered.length; i += per) {
      const slot = next.length + 1;
      const hole = Math.floor(next.length / perHole) + 1;
      const letter = perHole > 1 && settings.pairings.useLetters ? LETTERS[next.length % perHole] || "" : "";
      next.push({ number: slot, hole: `${hole}${letter}`, playerIds: ordered.slice(i, i + per).map((p) => p.id) });
    }
    setGroups(next);
    setUnassigned([]);
    toast.success(mode === "handicap" ? "Groups balanced by handicap." : "Groups shuffled randomly.");
  };

  const addEmptyGroup = () => {
    setGroups((g) => {
      const slot = (g.at(-1)?.number || 0) + 1;
      const perHole = Math.max(1, settings.pairings.groupsPerHole);
      const hole = Math.floor(g.length / perHole) + 1;
      const letter = perHole > 1 && settings.pairings.useLetters ? LETTERS[g.length % perHole] || "" : "";
      return [...g, { number: slot, hole: `${hole}${letter}`, playerIds: [] }];
    });
  };

  const confirmPairings = async () => {
    const eventId = id || (await persist());
    if (!eventId) return;
    setSaving(true);
    const labels: Record<string, string> = {};
    const updates: Promise<unknown>[] = [];
    groups.forEach((g) => {
      labels[String(g.number)] = g.hole;
      g.playerIds.forEach((pid, idx) => {
        updates.push(
          (supabase.from("tournament_registrations") as any)
            .update({ group_number: g.number, group_position: idx + 1, group_label: g.hole })
            .eq("id", pid),
        );
      });
    });
    unassigned.forEach((pid) => {
      updates.push(
        (supabase.from("tournament_registrations") as any)
          .update({ group_number: null, group_position: null, group_label: null })
          .eq("id", pid),
      );
    });
    await Promise.all(updates);

    // Keep pairings_config in sync so printables, emails and the public tee
    // sheet show the same starting holes.
    const { data: existing } = await (supabase.from("tournaments") as any)
      .select("pairings_config")
      .eq("id", eventId)
      .maybeSingle();
    const cfg = parsePairingsConfig(existing?.pairings_config);
    await (supabase.from("tournaments") as any)
      .update({ pairings_config: { ...cfg, labels: { ...cfg.labels, ...labels } } })
      .eq("id", eventId);

    setSaving(false);
    toast.success("Pairings confirmed.");
    loadPlayers(eventId);
    goto(4);
  };

  /* ---------------- navigation ---------------- */
  const goto = async (next: number) => {
    const nextSettings = { ...settings, wizardStep: next };
    setSettings(nextSettings);
    setStep(next);
    await persist({}, nextSettings);
  };

  const nextStep = async () => {
    if (step === 0 && !title.trim()) { toast.error("Give your tournament a name."); return; }
    if (step === 3) { await confirmPairings(); return; }
    await goto(Math.min(4, step + 1));
  };

  const publish = async () => {
    const eventId = id || (await persist());
    if (!eventId) return;
    await persist({ status: "ready", registration_open: settings.registration.enabled }, { ...settings, wizardStep: 4 });
    setStatus("ready");
    toast.success("Event published and ready.");
    navigate("/enterprise");
  };

  if (loading) {
    return (
      <EnterpriseLayout title="Create Event">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </EnterpriseLayout>
    );
  }

  return (
    <EnterpriseLayout
      title={title || `New ${eventTypeLabel(eventType)}`}
      crumbs={[{ label: "Events", to: "/enterprise" }, { label: id ? "Edit Event" : "Create Event" }]}
      actions={saving ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span> : undefined}
    >
      {/* step rail */}
      <ol className="mb-5 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => goto(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-secondary text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>} {s}
            </button>
          </li>
        ))}
      </ol>

      {/* STEP 1 */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Event Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Tournament Name</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Member-Guest Invitational" />
            </div>
            <div>
              <Label>Select Course</Label>
              <Select value={courseName || undefined} onValueChange={setCourseName}>
                <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.course_name}>{c.course_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Or type a course name"
              />
            </div>
            <div>
              <Label>Number of Holes</Label>
              <div className="mt-1 inline-flex rounded-md border border-border p-1">
                {[9, 18].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => update({ holes: h as 9 | 18, rounds: settings.rounds.map((r) => ({ ...r, holes: h as 9 | 18 })) })}
                    className={`rounded px-4 py-1.5 text-sm font-semibold ${
                      settings.holes === h ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {h} holes
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Event Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Start Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  update({ rounds: settings.rounds.map((r, i) => (i === 0 ? { ...r, time: e.target.value } : r)) });
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <Label>Rounds <Hint text="Add a second round on the same day (morning / afternoon) or on another date." /></Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update({
                      rounds: [
                        ...settings.rounds,
                        { label: `Round ${settings.rounds.length + 1}`, date: date, time: "13:00", holes: settings.holes },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Round
                </Button>
              </div>
              <div className="space-y-2">
                {settings.rounds.map((r, i) => (
                  <div key={i} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-4">
                    <Input
                      value={r.label}
                      onChange={(e) => update({ rounds: settings.rounds.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                      placeholder={`Round ${i + 1} — Morning`}
                    />
                    <Input
                      type="date"
                      value={r.date || date}
                      onChange={(e) => update({ rounds: settings.rounds.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })}
                    />
                    <Input
                      type="time"
                      value={r.time}
                      onChange={(e) => update({ rounds: settings.rounds.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
                    />
                    {settings.rounds.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => update({ rounds: settings.rounds.filter((_, j) => j !== i) })}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Player Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Players Per Team</Label>
              <Select value={String(settings.playersPerTeam)} onValueChange={(v) => update({ playersPerTeam: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Game Type</Label>
              <Select value={settings.gameType} onValueChange={(v) => update({ gameType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTERPRISE_GAME_TYPES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Skins</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={settings.skinsGross} onCheckedChange={(v) => update({ skinsGross: !!v })} /> Gross
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={settings.skinsNet} onCheckedChange={(v) => update({ skinsNet: !!v })} /> Net
                </label>
              </div>
            </div>
            <div>
              <Label>Deuces</Label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={settings.deucesGross} onCheckedChange={(v) => update({ deucesGross: !!v })} /> Gross
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={settings.deucesNet} onCheckedChange={(v) => update({ deucesNet: !!v })} /> Net
                </label>
              </div>
            </div>

            <div>
              <Label>Handicap Allowance — Player 1 (%)</Label>
              <Input
                type="number"
                value={settings.leaderboard.allowancePlayer1}
                onChange={(e) => update({ leaderboard: { ...settings.leaderboard, allowancePlayer1: Number(e.target.value) } })}
              />
            </div>
            <div>
              <Label>Handicap Allowance — Player 2 (%)</Label>
              <Input
                type="number"
                value={settings.leaderboard.allowancePlayer2}
                onChange={(e) => update({ leaderboard: { ...settings.leaderboard, allowancePlayer2: Number(e.target.value) } })}
              />
            </div>

            <div className="sm:col-span-2">
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Advanced Options <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 grid gap-4 rounded-md border border-border p-3 sm:grid-cols-2">
                  <div>
                    <Label>Max Course Handicap</Label>
                    <Input
                      type="number"
                      value={settings.leaderboard.maxCourseHandicap ?? ""}
                      onChange={(e) => update({ leaderboard: { ...settings.leaderboard, maxCourseHandicap: e.target.value ? Number(e.target.value) : null } })}
                    />
                  </div>
                  <div>
                    <Label>Max Course Handicap Differential</Label>
                    <Input
                      type="number"
                      value={settings.leaderboard.maxCourseHandicapDiff ?? ""}
                      onChange={(e) => update({ leaderboard: { ...settings.leaderboard, maxCourseHandicapDiff: e.target.value ? Number(e.target.value) : null } })}
                    />
                  </div>
                  <label className="flex items-center justify-between gap-2 text-sm sm:col-span-2">
                    Start at Handicap / Quota
                    <Switch
                      checked={settings.leaderboard.startAtHandicap}
                      onCheckedChange={(v) => update({ leaderboard: { ...settings.leaderboard, startAtHandicap: v } })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-sm sm:col-span-2">
                    Max Hole Score
                    <Input
                      type="number"
                      className="w-24"
                      value={settings.leaderboard.eventOptions.maxHoleScore ?? ""}
                      onChange={(e) => update({
                        leaderboard: {
                          ...settings.leaderboard,
                          eventOptions: { ...settings.leaderboard.eventOptions, maxHoleScore: e.target.value ? Number(e.target.value) : null },
                        },
                      })}
                    />
                  </label>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 2 && (
        <div className="space-y-4">
          <Tabs defaultValue="roster">
            <TabsList>
              <TabsTrigger value="roster">My Roster</TabsTrigger>
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="import">Import from Spreadsheet</TabsTrigger>
            </TabsList>

            <TabsContent value="roster" className="mt-3">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Pull from your club roster</CardTitle></CardHeader>
                <CardContent>
                  {roster.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No roster members yet. <Link to="/enterprise/roster" className="text-primary underline">Build My Roster</Link>.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                        {roster.map((m) => (
                          <label key={m.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                            <Checkbox
                              checked={rosterPicked.includes(m.id)}
                              onCheckedChange={(v) =>
                                setRosterPicked((p) => (v ? [...p, m.id] : p.filter((x) => x !== m.id)))
                              }
                            />
                            <span>{m.first_name} {m.last_name}</span>
                            {m.handicap_index != null && <span className="ml-auto text-xs text-muted-foreground">HCP {m.handicap_index}</span>}
                          </label>
                        ))}
                      </div>
                      <Button
                        className="bg-secondary text-primary hover:bg-secondary/90"
                        disabled={!rosterPicked.length}
                        onClick={async () => {
                          const picked = roster.filter((m) => rosterPicked.includes(m.id));
                          await addPlayers(picked.map((m) => ({
                            first_name: m.first_name,
                            last_name: m.last_name,
                            email: m.email || undefined,
                            phone: m.phone || undefined,
                            handicap_index: m.handicap_index,
                          })));
                          setRosterPicked([]);
                        }}
                      >
                        Add {rosterPicked.length || ""} selected
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-3">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Type in a player</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-5">
                  <Input placeholder="First name" value={manual.first_name} onChange={(e) => setManual({ ...manual, first_name: e.target.value })} />
                  <Input placeholder="Last name" value={manual.last_name} onChange={(e) => setManual({ ...manual, last_name: e.target.value })} />
                  <Input placeholder="Handicap" value={manual.handicap} onChange={(e) => setManual({ ...manual, handicap: e.target.value })} />
                  <Input placeholder="Email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
                  <Input placeholder="Phone" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
                  <div className="flex flex-wrap gap-2 sm:col-span-5">
                    <Button
                      className="bg-secondary text-primary hover:bg-secondary/90"
                      onClick={async () => {
                        if (!manual.first_name && !manual.last_name) { toast.error("Enter a name first."); return; }
                        await addPlayers([{
                          first_name: manual.first_name,
                          last_name: manual.last_name,
                          email: manual.email,
                          phone: manual.phone,
                          handicap_index: manual.handicap ? Number(manual.handicap) : null,
                        }]);
                        setManual({ first_name: "", last_name: "", handicap: "", email: "", phone: "" });
                      }}
                    >
                      <UserPlus className="mr-1.5 h-4 w-4" /> Add Player
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => addPlayers([{ first_name: "TBD", last_name: `Player ${players.length + 1}` }])}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Add TBD Player
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="mt-3">
              <SpreadsheetImportPanel onImport={importFromSheet} />
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Roster ({players.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">No players yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="font-medium">{p.first_name} {p.last_name}</span>
                      <span className="text-muted-foreground">HCP {p.handicap_index ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {p.group_number ? `Group ${p.group_label || p.group_number}` : "Unassigned"}
                      </span>
                      <Button variant="ghost" size="icon" className="ml-auto text-destructive" onClick={() => removePlayer(p.id)} aria-label="Remove player">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 4 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pairing Setup</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Players Per Pairing</Label>
                <Select
                  value={String(settings.pairings.playersPerPairing)}
                  onValueChange={(v) => update({ pairings: { ...settings.pairings, playersPerPairing: Number(v) } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pairings Per Hole</Label>
                <Input
                  type="number"
                  min={1}
                  max={3}
                  value={settings.pairings.groupsPerHole}
                  onChange={(e) => update({ pairings: { ...settings.pairings, groupsPerHole: Math.max(1, Number(e.target.value) || 1) } })}
                />
              </div>
              <label className="flex items-end justify-between gap-2 text-sm">
                <span>Use A, B, C groups per hole <Hint text="Two or three groups can share a starting hole — 1A, 1B, 1C." /></span>
                <Switch
                  checked={settings.pairings.useLetters}
                  onCheckedChange={(v) => update({ pairings: { ...settings.pairings, useLetters: v } })}
                />
              </label>
            </CardContent>
          </Card>

          <PairingsBoard
            players={pairingPlayers}
            groups={groups}
            unassigned={unassigned}
            playersPerPairing={settings.pairings.playersPerPairing}
            onChange={(g, u) => { setGroups(g); setUnassigned(u); }}
            onAutoAssign={autoAssign}
            onAddGroup={addEmptyGroup}
            onHoleChange={(num, hole) => setGroups((gs) => gs.map((g) => (g.number === num ? { ...g, hole } : g)))}
          />
        </div>
      )}

      {/* STEP 5 */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Review &amp; Publish</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Event", title || "Untitled"],
                ["Type", eventTypeLabel(eventType)],
                ["Course", courseName || "—"],
                ["Date", date || "No date set"],
                ["Holes", `${settings.holes}`],
                ["Rounds", settings.rounds.map((r) => r.label).join(", ")],
                ["Game type", gameTypeLabel(settings.gameType)],
                ["Players per team", String(settings.playersPerTeam)],
                ["Players added", String(players.length)],
                ["Groups", String(groups.length)],
                ["Skins", [settings.skinsGross && "Gross", settings.skinsNet && "Net"].filter(Boolean).join(" + ") || "Off"],
                ["Deuces", [settings.deucesGross && "Gross", settings.deucesNet && "Net"].filter(Boolean).join(" + ") || "Off"],
                ["Status", status],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-md border border-border p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="text-sm font-semibold text-foreground">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button onClick={publish} className="bg-secondary text-primary hover:bg-secondary/90">
                <Rocket className="mr-1.5 h-4 w-4" /> Publish Event
              </Button>
              {id && (
                <>
                  <Button asChild variant="outline"><Link to={`/dashboard?tournament_id=${id}`}>Open in main dashboard</Link></Button>
                  <Button asChild variant="outline"><Link to={`/dashboard/scoring?tournament_id=${id}`}>Enter scores</Link></Button>
                  <Button asChild variant="outline"><Link to={`/enterprise/registration?tournament_id=${id}`}>Registration page</Link></Button>
                  <Button asChild variant="outline"><Link to={`/enterprise/leaderboard-settings?tournament_id=${id}`}>Leaderboard settings</Link></Button>
                  <Button asChild variant="outline"><Link to={`/enterprise/printables?tournament_id=${id}`}>Print scorecards</Link></Button>
                  {slug && (
                    <Button asChild variant="outline"><a href={`/t/${slug}`} target="_blank" rel="noreferrer">View event page</a></Button>
                  )}
                </>
              )}

            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => goto(step - 1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        {step < 4 && (
          <Button onClick={nextStep} className="bg-secondary text-primary hover:bg-secondary/90">
            {step === 3 ? "Confirm Pairings" : "Next"} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>

      {ENTERPRISE_EVENT_TYPES.every((t) => t.value !== eventType) && (
        <p className="mt-3 text-xs text-muted-foreground">Unknown event type — saved as a single round.</p>
      )}
    </EnterpriseLayout>
  );
}
