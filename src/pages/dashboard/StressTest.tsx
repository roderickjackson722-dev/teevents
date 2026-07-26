import { useEffect, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QRCodeSVG } from "qrcode.react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, CheckCircle2, Download, ExternalLink, Gauge, Loader2, Play,
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

type TargetMode = "sandbox" | "live";

interface TestParticipant {
  id: string;
  name: string;
  handicap_index: number | null;
  playing_handicap: number | null;
}

interface RunEntity {
  id: string;
  name: string;
  playing_handicap: number | null;
}

interface LogRow {
  t: number;              // ms since run start
  player: string;
  hole: number;
  ok: boolean;
  writeMs: number;
  visibleMs: number | null;
  retries: number;
  error?: string;
}

const pct = (arr: number[], p: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const isTransient = (msg: string) => {
  const m = (msg || "").toLowerCase();
  return (
    m.includes("fetch") || m.includes("network") || m.includes("timeout") ||
    m.includes("timed out") || m.includes("502") || m.includes("503") ||
    m.includes("504") || m.includes("429") || m.includes("temporarily") ||
    m.includes("connection") || m.includes("aborted") || m.includes("deadlock")
  );
};

export default function StressTest() {
  const { org, loading: orgLoading } = useOrgContext();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useTournamentIdParam();

  /* target mode */
  const [targetMode, setTargetMode] = useState<TargetMode>("sandbox");
  const [liveAck, setLiveAck] = useState(false);

  /* mirror sandbox scores onto the public live leaderboard */
  const [mirrorLeaderboard, setMirrorLeaderboard] = useState(true);
  const mirrorMapRef = useRef<Record<string, string>>({}); // test participant id -> registration id

  /* seeding config */
  const [seedCount, setSeedCount] = useState("70");
  const [seeding, setSeeding] = useState(false);

  /* simulation config */
  const [concurrency, setConcurrency] = useState("25");
  const [holes, setHoles] = useState("3");
  const [durationSec, setDurationSec] = useState("120");
  const [sampleRate, setSampleRate] = useState("20"); // % of writes read-back verified
  const [maxRetries, setMaxRetries] = useState("3");

  /* run state */
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<LogRow[]>([]);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const cancelRef = useRef(false);
  const collectedRef = useRef<LogRow[]>([]);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, slug, custom_slug, course_par, test_mode_enabled, site_published, live_display_enabled")
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

  /* real registrations for live-tournament mode */
  const { data: realPlayers, isLoading: loadingReal } = useQuery({
    queryKey: ["stress-real-players", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, playing_handicap, handicap_index")
        .eq("tournament_id", selectedTournament)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Registered player",
        playing_handicap: (r.playing_handicap ?? r.handicap_index ?? null) as number | null,
      })) as RunEntity[];
    },
    enabled: !!selectedTournament && targetMode === "live",
  });

  const pool: RunEntity[] = useMemo(() => {
    if (targetMode === "live") return realPlayers ?? [];
    return (participants ?? []).map((p) => ({ id: p.id, name: p.name, playing_handicap: p.playing_handicap }));
  }, [targetMode, realPlayers, participants]);

  const scoringBase = tournament?.slug
    ? `${window.location.origin}/t/${tournament.slug}/scoring`
    : `${window.location.origin}/dashboard/scoring`;

  const publicSlug = (tournament as any)?.custom_slug || tournament?.slug;
  // The public leaderboard hides itself when the live display is switched off,
  // so fall back to preview mode which bypasses that gate for the organizer.
  const leaderboardUrl = publicSlug
    ? `${window.location.origin}/live/${publicSlug}${
        (tournament as any)?.live_display_enabled === false ? "?preview=1" : ""
      }`
    : `${window.location.origin}/dashboard/leaderboard?tournament_id=${selectedTournament}`;
  const tvDisplayUrl = publicSlug
    ? `${leaderboardUrl}${leaderboardUrl.includes("?") ? "&" : "?"}display=1`
    : leaderboardUrl;
  const leaderboardBlocked =
    targetMode === "sandbox" && mirrorLeaderboard && tournament && (tournament as any).site_published === false;
  const adminScoringUrl = `${window.location.origin}/dashboard/scoring?tournament_id=${selectedTournament}`;

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

  /* remove any registrations/scores we mirrored onto the public leaderboard */
  const removeMirroredData = async () => {
    const { data: regs } = await supabase
      .from("tournament_registrations")
      .select("id")
      .eq("tournament_id", selectedTournament)
      .like("email", "stress+%@teevents.test");
    const ids = (regs ?? []).map((r) => r.id as string);
    if (ids.length) {
      await supabase.from("tournament_scores").delete().in("registration_id", ids);
      await supabase.from("tournament_registrations").delete().in("id", ids);
    }
    mirrorMapRef.current = {};
    return ids.length;
  };

  const clearTestData = async () => {
    setSeeding(true);
    try {
      const mirrored = await removeMirroredData();
      await supabase.from("test_scores").delete().eq("tournament_id", selectedTournament);
      await supabase.from("test_participants").delete().eq("tournament_id", selectedTournament);
      await queryClient.invalidateQueries({ queryKey: ["stress-participants", selectedTournament] });
      await queryClient.invalidateQueries({ queryKey: ["stress-real-players", selectedTournament] });
      setLog([]);
      collectedRef.current = [];
      setFinishedAt(null);
      setProgress(0);
      toast({
        title: "Test data cleared",
        description: mirrored
          ? `${mirrored} mirrored leaderboard entr${mirrored === 1 ? "y" : "ies"} removed.`
          : "Test players and scores removed.",
      });
    } catch (e) {
      toast({ title: "Clear failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };


  /* ─────────── 2. SIMULATE ─────────── */
  const submitScore = async (
    entity: RunEntity,
    hole: number,
    gross: number,
    net: number,
  ): Promise<{ ok: boolean; error?: string; retries: number }> => {
    const attempts = Math.max(0, Math.min(6, parseInt(maxRetries) || 0));
    let retries = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const { error } =
          targetMode === "live"
            ? await supabase.from("tournament_scores").upsert(
                {
                  tournament_id: selectedTournament,
                  registration_id: entity.id,
                  hole_number: hole,
                  strokes: gross,
                },
                { onConflict: "registration_id,hole_number" },
              )
            : await supabase.from("test_scores").upsert(
                {
                  tournament_id: selectedTournament,
                  test_participant_id: entity.id,
                  hole_number: hole,
                  gross_score: gross,
                  net_score: net,
                },
                { onConflict: "test_participant_id,hole_number" },
              );
        if (error) throw error;
        // mirror sandbox scores onto the public leaderboard so [TEST] names appear live
        if (targetMode === "sandbox" && mirrorLeaderboard) {
          const regId = mirrorMapRef.current[entity.id];
          if (regId) {
            void supabase.from("tournament_scores").upsert(
              {
                tournament_id: selectedTournament,
                registration_id: regId,
                hole_number: hole,
                strokes: gross,
              },
              { onConflict: "registration_id,hole_number" },
            );
          }
        }
        return { ok: true, retries };
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        if (retries < attempts && isTransient(msg)) {
          retries += 1;
          // exponential backoff with jitter
          await new Promise((r) => setTimeout(r, 150 * 2 ** (retries - 1) + Math.random() * 100));
          continue;
        }
        return { ok: false, error: msg, retries };
      }
    }
  };

  const verifyVisible = async (entity: RunEntity, hole: number, gross: number) => {
    const v0 = performance.now();
    for (let attempt = 0; attempt < 20; attempt++) {
      if (targetMode === "live") {
        const { data } = await supabase
          .from("tournament_scores")
          .select("strokes")
          .eq("registration_id", entity.id)
          .eq("hole_number", hole)
          .maybeSingle();
        if (data?.strokes === gross) break;
      } else {
        const { data } = await supabase
          .from("test_scores")
          .select("gross_score")
          .eq("test_participant_id", entity.id)
          .eq("hole_number", hole)
          .maybeSingle();
        if (data?.gross_score === gross) break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return performance.now() - v0;
  };

  const runSimulation = async () => {
    if (!pool.length) {
      toast({
        title: targetMode === "live" ? "No registrations found for this tournament" : "Seed test players first",
        variant: "destructive",
      });
      return;
    }
    if (targetMode === "live" && !liveAck) {
      toast({ title: "Confirm the live-tournament warning first", variant: "destructive" });
      return;
    }

    const conc = Math.max(1, Math.min(pool.length, parseInt(concurrency) || 25));
    const holeCount = Math.max(1, Math.min(18, parseInt(holes) || 3));
    const totalSec = Math.max(10, Math.min(600, parseInt(durationSec) || 120));
    const verifyPct = Math.max(0, Math.min(100, parseInt(sampleRate) || 20));

    const runPool = pool.slice(0, conc);
    const holeList = Array.from({ length: holeCount }, (_, i) => i + 1);
    const totalWrites = runPool.length * holeCount;
    const gapMs = Math.max(0, Math.floor((totalSec * 1000) / holeCount));

    /* live mode: snapshot existing scores so we can restore afterwards */
    let snapshot: { registration_id: string; hole_number: number; strokes: number }[] = [];
    if (targetMode === "live") {
      const { data } = await supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes")
        .eq("tournament_id", selectedTournament)
        .in("registration_id", runPool.map((p) => p.id))
        .in("hole_number", holeList);
      snapshot = (data ?? []) as typeof snapshot;
    }

    /* sandbox mirroring: ensure every test player has a throwaway registration
       so their scores show up on the public live leaderboard during the run */
    if (targetMode === "sandbox" && mirrorLeaderboard) {
      try {
        const emailFor = (id: string) => `stress+${id}@teevents.test`;
        const { data: existing } = await supabase
          .from("tournament_registrations")
          .select("id, email")
          .eq("tournament_id", selectedTournament)
          .like("email", "stress+%@teevents.test");
        const byEmail: Record<string, string> = {};
        (existing ?? []).forEach((r: any) => { byEmail[r.email] = r.id; });

        const missing = runPool.filter((p) => !byEmail[emailFor(p.id)]);
        if (missing.length) {
          const { data: inserted, error: insErr } = await supabase
            .from("tournament_registrations")
            .insert(
              missing.map((p, i) => {
                const clean = p.name.replace("[TEST] ", "");
                const [first, ...rest] = clean.split(" ");
                return {
                  tournament_id: selectedTournament,
                  first_name: `[TEST] ${first}`,
                  last_name: rest.join(" ") || "Player",
                  email: emailFor(p.id),
                  payment_status: "paid",
                  group_number: Math.floor(i / 4) + 1,
                  playing_handicap: p.playing_handicap ?? null,
                } as any;
              }),
            )
            .select("id, email");
          if (insErr) throw insErr;
          (inserted ?? []).forEach((r: any) => { byEmail[r.email] = r.id; });
        }
        mirrorMapRef.current = Object.fromEntries(
          runPool.map((p) => [p.id, byEmail[emailFor(p.id)]]).filter(([, v]) => !!v) as [string, string][],
        );
      } catch (e) {
        mirrorMapRef.current = {};
        toast({
          title: "Leaderboard mirroring unavailable",
          description: (e as Error).message,
          variant: "destructive",
        });
      }
    }



    setRunning(true);
    setProgress(0);
    setLog([]);
    collectedRef.current = [];
    setFinishedAt(null);
    cancelRef.current = false;

    const started = performance.now();
    const collected = collectedRef.current;
    let done = 0;

    // flush the log to the UI on a timer so charts update live without thrashing React
    const flush = window.setInterval(() => setLog([...collected]), 400);

    try {
      for (const h of holeList) {
        if (cancelRef.current) break;
        const waveStart = performance.now();

        await Promise.all(
          runPool.map(async (p) => {
            const gross = 3 + Math.floor(Math.random() * 4);
            const net = Math.max(1, gross - Math.round((p.playing_handicap ?? 0) / 18));
            const t0 = performance.now();
            const res = await submitScore(p, h, gross, net);
            const writeMs = performance.now() - t0;

            let visibleMs: number | null = null;
            if (res.ok && Math.random() * 100 < verifyPct) {
              visibleMs = (await verifyVisible(p, h, gross)) + writeMs;
            }

            collected.push({
              t: Math.round(performance.now() - started),
              player: p.name,
              hole: h,
              ok: res.ok,
              writeMs: Math.round(writeMs),
              visibleMs: visibleMs != null ? Math.round(visibleMs) : null,
              retries: res.retries,
              error: res.error,
            });
            done += 1;
            setProgress(Math.round((done / totalWrites) * 100));
          }),
        );

        setLog([...collected]);

        const elapsed = performance.now() - waveStart;
        const wait = gapMs - elapsed;
        if (wait > 0 && h < holeCount && !cancelRef.current) {
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    } finally {
      window.clearInterval(flush);
      setLog([...collected]);
    }

    /* live mode: restore the tournament to its pre-test state */
    if (targetMode === "live") {
      setRestoring(true);
      try {
        await supabase
          .from("tournament_scores")
          .delete()
          .eq("tournament_id", selectedTournament)
          .in("registration_id", runPool.map((p) => p.id))
          .in("hole_number", holeList);
        if (snapshot.length) {
          await supabase.from("tournament_scores").insert(
            snapshot.map((s) => ({ ...s, tournament_id: selectedTournament })),
          );
        }
      } catch (e) {
        toast({ title: "Restore warning", description: (e as Error).message, variant: "destructive" });
      } finally {
        setRestoring(false);
      }
    }

    setRunning(false);
    setFinishedAt(Date.now());
    queryClient.invalidateQueries({ queryKey: ["stress-participants", selectedTournament] });
    toast({
      title: "Simulation complete",
      description:
        targetMode === "live"
          ? "Real scores were restored to their pre-test values. See the Results tab."
          : mirrorLeaderboard
            ? "Test scores are on the live leaderboard. Use Reset & Remove All Test Data when you're done."
            : "See the Results tab for the readiness report.",
    });

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
      retries: log.reduce((a, l) => a + l.retries, 0),
      recovered: log.filter((l) => l.ok && l.retries > 0).length,
      errorRate,
      avgWrite: writeTimes.length ? Math.round(writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length) : 0,
      p95Write: Math.round(pct(writeTimes, 95)),
      maxWrite: writeTimes.length ? Math.round(Math.max(...writeTimes)) : 0,
      verified: visTimes.length,
      avgVisible: visTimes.length ? Math.round(visTimes.reduce((a, b) => a + b, 0) / visTimes.length) : 0,
      p95Visible: Math.round(pct(visTimes, 95)),
    };
  }, [log]);

  /* time-bucketed series for the live charts */
  const series = useMemo(() => {
    if (!log.length) return [] as { s: number; p95Write: number; p95Visible: number | null; errorRate: number; throughput: number }[];
    const BUCKET = 5000;
    const maxT = log[log.length - 1].t;
    const buckets: LogRow[][] = Array.from({ length: Math.floor(maxT / BUCKET) + 1 }, () => []);
    log.forEach((l) => buckets[Math.floor(l.t / BUCKET)].push(l));
    return buckets.map((rows, i) => {
      const w = rows.filter((r) => r.ok).map((r) => r.writeMs);
      const v = rows.filter((r) => r.visibleMs != null).map((r) => r.visibleMs as number);
      return {
        s: (i * BUCKET) / 1000,
        p95Write: Math.round(pct(w, 95)),
        p95Visible: v.length ? Math.round(pct(v, 95)) : null,
        errorRate: rows.length ? +((rows.filter((r) => !r.ok).length / rows.length) * 100).toFixed(3) : 0,
        throughput: Math.round(rows.length / (BUCKET / 1000)),
      };
    });
  }, [log]);

  const errorAlert = metrics.total > 0 && metrics.errorRate > TARGET_ERROR_RATE;

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
      label: "Transient failures recovered",
      value: `${metrics.recovered} recovered · ${metrics.retries} retries`,
      target: "no unrecovered errors",
      pass: metrics.total > 0 && metrics.failures === 0,
      action: "Retries fired but some writes still failed. Investigate the error text before event day.",
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
    const header = "elapsed_ms,player,hole,status,write_ms,visible_ms,retries,error\n";
    const body = log
      .map((l) => [l.t, `"${l.player}"`, l.hole, l.ok ? "ok" : "error", l.writeMs, l.visibleMs ?? "", l.retries, `"${(l.error ?? "").replace(/"/g, "'")}"`].join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stress-test-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (targetMode === "sandbox") setLiveAck(false);
  }, [targetMode]);

  if (orgLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const liveCharts = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Latency p95 over time (ms)</CardTitle>
          <CardDescription className="text-xs">Write vs leaderboard visibility, 5-second buckets</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="s" tick={{ fontSize: 11 }} unit="s" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="p95Write" name="Write p95" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="p95Visible" name="Visibility p95" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Error rate & throughput</CardTitle>
          <CardDescription className="text-xs">Error % per bucket, writes per second</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="s" tick={{ fontSize: 11 }} unit="s" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="throughput" name="Writes/sec" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="errorRate" name="Error %" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const statTiles = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: "Error rate", value: `${(metrics.errorRate * 100).toFixed(3)}%`, bad: metrics.errorRate > TARGET_ERROR_RATE },
        { label: "Write p95", value: `${metrics.p95Write} ms`, bad: metrics.p95Write >= TARGET_WRITE_MS },
        { label: "Visibility p95", value: metrics.verified ? `${metrics.p95Visible} ms` : "—", bad: metrics.verified > 0 && metrics.p95Visible >= TARGET_VISIBILITY_MS },
        { label: "Retries fired", value: `${metrics.retries}`, bad: false },
      ].map((s) => (
        <Card key={s.label}>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold ${s.bad ? "text-destructive" : ""}`}>{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

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

      <div className="flex flex-wrap items-center gap-3">
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

        <Select value={targetMode} onValueChange={(v) => setTargetMode(v as TargetMode)} disabled={running}>
          <SelectTrigger className="w-[280px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox — isolated [TEST] players</SelectItem>
            <SelectItem value="live">Live tournament — real registrations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedTournament && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Gauge className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a tournament above to build a test environment.</p>
          </CardContent>
        </Card>
      )}

      {selectedTournament && errorAlert && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive">Error rate target exceeded</p>
            <p className="text-sm text-muted-foreground">
              {(metrics.errorRate * 100).toFixed(3)}% of submissions failed after retries (target &lt; 0.01%).
              {metrics.retries > 0 && ` ${metrics.recovered} write(s) recovered via automatic retry.`} Review the run log
              and re-test before event day.
            </p>
          </div>
        </div>
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

                <div className="text-sm flex items-center gap-2">
                  {loadingP ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant="secondary">{participants?.length ?? 0} test players ready</Badge>
                  )}
                  {targetMode === "live" && (
                    <Badge variant="outline">
                      {loadingReal ? "loading…" : `${realPlayers?.length ?? 0} real registrations`}
                    </Badge>
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
                  Target: <strong>{targetMode === "live" ? "live tournament registrations" : "sandbox [TEST] players"}</strong>
                  {" · "}{pool.length} player(s) available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {targetMode === "sandbox" && (
                  <div className="rounded-lg border p-3 flex items-start gap-2">
                    <Checkbox
                      id="mirror-lb"
                      checked={mirrorLeaderboard}
                      onCheckedChange={(v) => setMirrorLeaderboard(!!v)}
                      disabled={running}
                    />
                    <Label htmlFor="mirror-lb" className="text-xs font-normal leading-relaxed">
                      Show test players on the live leaderboard. Creates temporary [TEST] entries so you can watch the
                      public leaderboard update in real time. They are removed with "Reset &amp; Remove All Test Data".
                    </Label>
                  </div>
                )}
                {targetMode === "live" && (

                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Live tournament mode
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This writes real hole scores for real registrations so you exercise the exact production path
                      (scoring, leaderboard, realtime). Existing scores for the tested holes are snapshotted before the run
                      and restored automatically when it finishes. Do not run this while players are actively scoring.
                    </p>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox checked={liveAck} onCheckedChange={(c) => setLiveAck(!!c)} disabled={running} />
                      I understand real scores will be written and then restored.
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  <div>
                    <Label className="text-xs">Max retries / write</Label>
                    <Input type="number" min={0} max={6} value={maxRetries} onChange={(e) => setMaxRetries(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={runSimulation} disabled={running || !pool.length || (targetMode === "live" && !liveAck)}>
                    {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                    {running ? "Running…" : "Start Simulation"}
                  </Button>
                  {running && (
                    <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
                      <RotateCcw className="h-4 w-4 mr-1.5" /> Stop
                    </Button>
                  )}
                  {restoring && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> restoring original scores…
                    </span>
                  )}
                </div>

                {(running || progress > 0) && (
                  <div className="space-y-1">
                    <Progress value={progress} />
                    <p className="text-xs text-muted-foreground">
                      {progress}% — {log.length} submissions logged
                      {metrics.retries > 0 && <span> · {metrics.retries} retries</span>}
                      {metrics.failures > 0 && <span className="text-destructive"> · {metrics.failures} errors</span>}
                    </p>
                  </div>
                )}

                {log.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {statTiles}
                    {liveCharts}
                  </div>
                )}

                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Tip: open the live leaderboard on a second screen while this runs to visually confirm real-time
                    updates, and edit one player's score from the admin scoring page to verify overrides land instantly.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={leaderboardUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Live Leaderboard
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={`${leaderboardUrl}?display=1`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> TV Display Mode
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={adminScoringUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Admin Scoring
                      </a>
                    </Button>
                  </div>
                  {targetMode === "sandbox" && !mirrorLeaderboard && (
                    <p className="text-xs text-muted-foreground">
                      Heads up: with leaderboard mirroring off, sandbox scores stay in the isolated test tables and will
                      not appear on the live leaderboard.
                    </p>
                  )}
                </div>

                {(finishedAt || (participants?.length ?? 0) > 0) && !running && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button variant="destructive" size="sm" onClick={clearTestData} disabled={seeding}>
                      {seeding ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                      Reset &amp; Remove All Test Data
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Deletes [TEST] players, their scores, and anything mirrored to the live leaderboard.
                    </span>
                  </div>
                )}
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
                {statTiles}
                {liveCharts}

                <Card className={readiness ? "border-green-500/50" : "border-destructive/50"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {readiness
                        ? <><CheckCircle2 className="h-5 w-5 text-green-600" /> System is ready for the live event</>
                        : <><AlertTriangle className="h-5 w-5 text-destructive" /> Issues found — review before event day</>}
                    </CardTitle>
                    <CardDescription>
                      {metrics.total} submissions · {metrics.verified} read-back verified · target:{" "}
                      {targetMode === "live" ? "live registrations" : "sandbox players"}
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
                            <TableHead>Retries</TableHead>
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
                              <TableCell className="text-xs">{l.retries || "—"}</TableCell>
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
