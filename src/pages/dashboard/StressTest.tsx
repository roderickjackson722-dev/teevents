import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity, AlertTriangle, CheckCircle2, Download, Gauge, Loader2, Play,
  QrCode, RotateCcw, Trash2, Users, XCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ─────────── targets ─────────── */
const TARGET_ERROR_RATE = 0.0001; // 0.01%
const TARGET_VISIBILITY_MS = 2000; // leaderboard reflects score < 2s
const TARGET_WRITE_MS = 1000;

/* ─────────── mock name pools ─────────── */
const FIRST = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Karen", "Charles", "Sarah", "Chris", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Sandra", "Mark", "Ashley", "Donald", "Kimberly", "Steven", "Donna", "Andrew", "Carol"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Clark", "Lewis", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker", "Adams"];

interface TestParticipant {
  id: string;
  name: string;
  handicap_index: number | null;
  playing_handicap: number | null;
}

interface LogRow {
  t: number;              // ms since run start
  player: string;
  hole: number;
  ok: boolean;
  writeMs: number;
  visibleMs: number | null;
  error?: string;
}

const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

export default function StressTest() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();

  /* seeding config */
  const [seedCount, setSeedCount] = useState("70");
  const [seeding, setSeeding] = useState(false);

  /* simulation config */
  const [concurrency, setConcurrency] = useState("25");
  const [holes, setHoles] = useState("3");
  const [durationSec, setDurationSec] = useState("120");
  const [sampleRate, setSampleRate] = useState("20"); // % of writes read-back verified

  /* run state */
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<LogRow[]>([]);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const cancelRef = useRef(false);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, slug, course_par, test_mode_enabled")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const tournament = tournaments?.find((t) => t.id === selectedTournament);

  const { data: participants, isLoading: loadingP } = useQuery({
    queryKey: ["stress-participants", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_participants")
        .select("id, name, handicap_index, playing_handicap")
        .eq("tournament_id", selectedTournament)
        .order("created_at");
      if (error) throw error;
      return data as TestParticipant[];
    },
    enabled: !!selectedTournament,
  });

  const scoringBase = tournament?.slug
    ? `${window.location.origin}/t/${tournament.slug}/scoring`
    : `${window.location.origin}/dashboard/scoring`;

  const codeFor = (id: string) => id.replace(/-/g, "").slice(0, 6).toUpperCase();

  /* ─────────── 1. SEED ─────────── */
  const seedPlayers = async () => {
    const n = Math.max(1, Math.min(300, parseInt(seedCount) || 70));
    setSeeding(true);
    try {
      const rows = Array.from({ length: n }, (_, i) => {
        const first = FIRST[i % FIRST.length];
        const last = LAST[(i * 7 + 3) % LAST.length];
        const hcIndex = Math.round((Math.random() * 26 + 1) * 10) / 10;
        return {
          tournament_id: selectedTournament,
          name: `[TEST] ${first} ${last} #${i + 1}`,
          handicap_index: hcIndex,
          course_handicap: Math.round(hcIndex),
          playing_handicap: Math.round(hcIndex * 0.95),
        };
      });
      const { error } = await supabase.from("test_participants").insert(rows);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["stress-participants", selectedTournament] });
      toast({ title: `Seeded ${n} test players`, description: "Each has a unique scoring code and QR code." });
    } catch (e) {
      toast({ title: "Seeding failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const clearTestData = async () => {
    setSeeding(true);
    try {
      await supabase.from("test_scores").delete().eq("tournament_id", selectedTournament);
      await supabase.from("test_participants").delete().eq("tournament_id", selectedTournament);
      await queryClient.invalidateQueries({ queryKey: ["stress-participants", selectedTournament] });
      setLog([]);
      setFinishedAt(null);
      toast({ title: "Test data cleared" });
    } catch (e) {
      toast({ title: "Clear failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  /* ─────────── 2. SIMULATE ─────────── */
  const runSimulation = async () => {
    if (!participants?.length) {
      toast({ title: "Seed test players first", variant: "destructive" });
      return;
    }
    const conc = Math.max(1, Math.min(participants.length, parseInt(concurrency) || 25));
    const holeCount = Math.max(1, Math.min(18, parseInt(holes) || 3));
    const totalSec = Math.max(10, Math.min(600, parseInt(durationSec) || 120));
    const verifyPct = Math.max(0, Math.min(100, parseInt(sampleRate) || 20));

    const pool = participants.slice(0, conc);
    const totalWrites = pool.length * holeCount;
    const gapMs = Math.max(0, Math.floor((totalSec * 1000) / holeCount)); // one wave per hole

    setRunning(true);
    setProgress(0);
    setLog([]);
    setFinishedAt(null);
    cancelRef.current = false;

    const started = performance.now();
    const collected: LogRow[] = [];
    let done = 0;

    for (let h = 1; h <= holeCount; h++) {
      if (cancelRef.current) break;
      const waveStart = performance.now();

      // fire the whole wave concurrently — this is the concurrent-write test
      await Promise.all(
        pool.map(async (p) => {
          const gross = 3 + Math.floor(Math.random() * 4);
          const net = Math.max(1, gross - Math.round((p.playing_handicap ?? 0) / 18));
          const t0 = performance.now();
          let ok = true;
          let err: string | undefined;
          try {
            const { error } = await supabase.from("test_scores").upsert(
              {
                tournament_id: selectedTournament,
                test_participant_id: p.id,
                hole_number: h,
                gross_score: gross,
                net_score: net,
              },
              { onConflict: "test_participant_id,hole_number" },
            );
            if (error) throw error;
          } catch (e) {
            ok = false;
            err = (e as Error).message;
          }
          const writeMs = performance.now() - t0;

          // read-back visibility check on a sample of writes
          let visibleMs: number | null = null;
          if (ok && Math.random() * 100 < verifyPct) {
            const v0 = performance.now();
            for (let attempt = 0; attempt < 20; attempt++) {
              const { data } = await supabase
                .from("test_scores")
                .select("gross_score")
                .eq("test_participant_id", p.id)
                .eq("hole_number", h)
                .maybeSingle();
              if (data?.gross_score === gross) break;
              await new Promise((r) => setTimeout(r, 100));
            }
            visibleMs = performance.now() - v0 + writeMs;
          }

          collected.push({
            t: Math.round(performance.now() - started),
            player: p.name,
            hole: h,
            ok,
            writeMs: Math.round(writeMs),
            visibleMs: visibleMs != null ? Math.round(visibleMs) : null,
            error: err,
          });
          done += 1;
          setProgress(Math.round((done / totalWrites) * 100));
        }),
      );

      setLog([...collected]);

      // pace the waves so the run spans the configured window
      const elapsed = performance.now() - waveStart;
      if (h < holeCount && gapMs > elapsed && !cancelRef.current) {
        await new Promise((r) => setTimeout(r, gapMs - elapsed));
      }
    }

    setLog([...collected]);
    setFinishedAt(Date.now());
    setRunning(false);
    setProgress(100);
    queryClient.invalidateQueries({ queryKey: ["stress-participants", selectedTournament] });
    toast({ title: "Simulation complete", description: "See the Results tab for the readiness report." });
  };

  /* ─────────── 3. METRICS ─────────── */
  const metrics = useMemo(() => {
    const total = log.length;
    const failures = log.filter((l) => !l.ok);
    const writeTimes = log.filter((l) => l.ok).map((l) => l.writeMs);
    const visTimes = log.filter((l) => l.visibleMs != null).map((l) => l.visibleMs as number);
    const errorRate = total ? failures.length / total : 0;
    return {
      total,
      failures: failures.length,
      errorRate,
      avgWrite: writeTimes.length ? Math.round(writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length) : 0,
      p95Write: Math.round(pct(writeTimes, 95)),
      maxWrite: writeTimes.length ? Math.round(Math.max(...writeTimes)) : 0,
      verified: visTimes.length,
      avgVisible: visTimes.length ? Math.round(visTimes.reduce((a, b) => a + b, 0) / visTimes.length) : 0,
      p95Visible: Math.round(pct(visTimes, 95)),
    };
  }, [log]);

  const checks = useMemo(() => ([
    {
      label: "Error rate",
      value: `${(metrics.errorRate * 100).toFixed(3)}% (${metrics.failures}/${metrics.total})`,
      target: "< 0.01%",
      pass: metrics.total > 0 && metrics.errorRate <= TARGET_ERROR_RATE,
      action: "Any failed write means a player could lose a score. Check the log below for the error text and re-run before event day.",
    },
    {
      label: "Score write time (p95)",
      value: `${metrics.p95Write} ms`,
      target: `< ${TARGET_WRITE_MS} ms`,
      pass: metrics.total > 0 && metrics.p95Write < TARGET_WRITE_MS,
      action: "Slow writes usually mean database load. Consider upgrading the backend instance before the event.",
    },
    {
      label: "Leaderboard visibility (p95)",
      value: metrics.verified ? `${metrics.p95Visible} ms` : "not sampled",
      target: `< ${TARGET_VISIBILITY_MS} ms`,
      pass: metrics.verified > 0 && metrics.p95Visible < TARGET_VISIBILITY_MS,
      action: "If scores take over 2s to appear, raise the read-back sample or investigate leaderboard refresh logic.",
    },
    {
      label: "Concurrent writes stable",
      value: `${concurrency} simultaneous entries × ${holes} holes`,
      target: "no data loss",
      pass: metrics.total > 0 && metrics.failures === 0,
      action: "Re-run with the same settings to confirm the result is repeatable.",
    },
  ]), [metrics, concurrency, holes]);

  const readiness = metrics.total > 0 && checks.every((c) => c.pass);

  const downloadLog = () => {
    const header = "elapsed_ms,player,hole,status,write_ms,visible_ms,error\n";
    const body = log
      .map((l) => [l.t, `"${l.player}"`, l.hole, l.ok ? "ok" : "error", l.writeMs, l.visibleMs ?? "", `"${(l.error ?? "").replace(/"/g, "'")}"`].join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stress-test-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (orgLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Gauge className="h-6 w-6" /> Event Readiness Stress Test
        </h1>
        <p className="text-muted-foreground">
          Seed mock players, fire concurrent score submissions, and get a pass/fail readiness report before event day.
        </p>
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedTournament && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Gauge className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a tournament above to build a test environment.</p>
          </CardContent>
        </Card>
      )}

      {selectedTournament && (
        <Tabs defaultValue="seed" className="space-y-4">
          <TabsList>
            <TabsTrigger value="seed"><Users className="h-4 w-4 mr-1.5" /> Seed Players</TabsTrigger>
            <TabsTrigger value="run"><Activity className="h-4 w-4 mr-1.5" /> Run Simulation</TabsTrigger>
            <TabsTrigger value="results"><Gauge className="h-4 w-4 mr-1.5" /> Results</TabsTrigger>
            <TabsTrigger value="qr"><QrCode className="h-4 w-4 mr-1.5" /> Check-In QR Sheet</TabsTrigger>
          </TabsList>

          {/* ═══ SEED ═══ */}
          <TabsContent value="seed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Seeding</CardTitle>
                <CardDescription>
                  Creates isolated mock players (prefixed with [TEST]) with a handicap, a unique scoring code, and a scannable
                  QR code. Real registrations are never touched.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label className="text-xs">Number of test players</Label>
                    <Input type="number" min={1} max={300} value={seedCount} onChange={(e) => setSeedCount(e.target.value)} className="w-32" />
                  </div>
                  <Button onClick={seedPlayers} disabled={seeding}>
                    {seeding ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Users className="h-4 w-4 mr-1.5" />}
                    Seed Test Players
                  </Button>
                  <Button variant="outline" onClick={clearTestData} disabled={seeding}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Clear All Test Data
                  </Button>
                </div>

                <div className="text-sm">
                  {loadingP ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant="secondary">{participants?.length ?? 0} test players ready</Badge>
                  )}
                </div>

                {!!participants?.length && (
                  <div className="max-h-80 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Handicap</TableHead>
                          <TableHead>Scoring Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.handicap_index ?? "—"}</TableCell>
                            <TableCell>
                              <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{codeFor(p.id)}</code>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ RUN ═══ */}
          <TabsContent value="run" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Simulation Script</CardTitle>
                <CardDescription>
                  Each hole is one wave of simultaneous submissions. Waves are paced so the run spans the configured window.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Concurrent players</Label>
                    <Input type="number" min={1} value={concurrency} onChange={(e) => setConcurrency(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Holes submitted</Label>
                    <Input type="number" min={1} max={18} value={holes} onChange={(e) => setHoles(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Run window (seconds)</Label>
                    <Input type="number" min={10} max={600} value={durationSec} onChange={(e) => setDurationSec(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Read-back sample (%)</Label>
                    <Input type="number" min={0} max={100} value={sampleRate} onChange={(e) => setSampleRate(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={runSimulation} disabled={running || !participants?.length}>
                    {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                    {running ? "Running…" : "Start Simulation"}
                  </Button>
                  {running && (
                    <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
                      <RotateCcw className="h-4 w-4 mr-1.5" /> Stop
                    </Button>
                  )}
                </div>

                {(running || progress > 0) && (
                  <div className="space-y-1">
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground">
                      {progress}% — {log.length} submissions logged
                      {metrics.failures > 0 && <span className="text-destructive"> · {metrics.failures} errors</span>}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Tip: open the live leaderboard on a second screen while this runs to visually confirm real-time updates,
                  and edit one test player's score from the admin scoring page to verify overrides land instantly.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ RESULTS ═══ */}
          <TabsContent value="results" className="space-y-4">
            {metrics.total === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Run a simulation to generate a readiness report.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className={readiness ? "border-green-500/50" : "border-destructive/50"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {readiness
                        ? <><CheckCircle2 className="h-5 w-5 text-green-600" /> System is ready for the live event</>
                        : <><AlertTriangle className="h-5 w-5 text-destructive" /> Issues found — review before event day</>}
                    </CardTitle>
                    <CardDescription>
                      {metrics.total} submissions · {metrics.verified} read-back verified
                      {finishedAt && ` · finished ${new Date(finishedAt).toLocaleTimeString()}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aspect</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {checks.map((c) => (
                          <TableRow key={c.label}>
                            <TableCell className="font-medium">
                              {c.label}
                              {!c.pass && <p className="text-xs text-muted-foreground mt-1">{c.action}</p>}
                            </TableCell>
                            <TableCell>{c.value}</TableCell>
                            <TableCell className="text-muted-foreground">{c.target}</TableCell>
                            <TableCell>
                              {c.pass
                                ? <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Pass</Badge>
                                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Review</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Run Log</CardTitle>
                        <CardDescription>
                          avg write {metrics.avgWrite} ms · p95 {metrics.p95Write} ms · max {metrics.maxWrite} ms
                          {metrics.verified > 0 && ` · avg visible ${metrics.avgVisible} ms`}
                        </CardDescription>
                      </div>
                      <Button variant="outline" onClick={downloadLog}>
                        <Download className="h-4 w-4 mr-1.5" /> Download CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>+ms</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Hole</TableHead>
                            <TableHead>Write</TableHead>
                            <TableHead>Visible</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {log.slice(-300).map((l, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-muted-foreground">{l.t}</TableCell>
                              <TableCell className="text-xs">{l.player}</TableCell>
                              <TableCell className="text-xs">{l.hole}</TableCell>
                              <TableCell className="text-xs">{l.writeMs} ms</TableCell>
                              <TableCell className="text-xs">{l.visibleMs != null ? `${l.visibleMs} ms` : "—"}</TableCell>
                              <TableCell className="text-xs">
                                {l.ok ? <span className="text-green-600">ok</span> : <span className="text-destructive">{l.error}</span>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ═══ QR SHEET ═══ */}
          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Check-In QR Sheet</CardTitle>
                    <CardDescription>
                      One unique QR code per test player. Scan a sample on a phone to confirm each resolves correctly,
                      then print as a backup sheet for event day.
                    </CardDescription>
                  </div>
                  <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
                    <QrCode className="h-4 w-4 mr-1.5" /> Print Sheet
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!participants?.length ? (
                  <p className="text-muted-foreground text-center py-6">Seed test players first.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {participants.map((p) => (
                      <div key={p.id} className="border rounded-lg p-3 flex flex-col items-center gap-2 print:break-inside-avoid">
                        <QRCodeSVG value={`${scoringBase}?code=${codeFor(p.id)}`} size={110} />
                        <div className="text-center">
                          <p className="text-xs font-medium">{p.name}</p>
                          <code className="text-[10px] text-muted-foreground">{codeFor(p.id)}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
