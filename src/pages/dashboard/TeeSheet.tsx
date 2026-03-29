import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Loader2, Clock, Shuffle, ArrowDownAZ, Printer, Users, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Registration {
  id: string;
  first_name: string;
  last_name: string;
  handicap: number | null;
  group_number: number | null;
  group_position: number | null;
}

interface TeeGroup {
  number: number;
  players: Registration[];
  teeTime: string;
  cartNumber: number;
  expectedFinish: string;
}

export default function TeeSheet() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [startFormat, setStartFormat] = useState<"tee_times" | "shotgun">("shotgun");
  const [firstTeeTime, setFirstTeeTime] = useState("08:00");
  const [interval, setInterval] = useState(10); // minutes between groups
  const [groupSize, setGroupSize] = useState(4);
  const [paceMinutes, setPaceMinutes] = useState(240); // 4 hours for 18 holes
  const [generating, setGenerating] = useState(false);
  const [teeGroups, setTeeGroups] = useState<TeeGroup[]>([]);

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, max_players")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  const { data: registrations, isLoading: regLoading } = useQuery({
    queryKey: ["teesheet-registrations", selectedTournament],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("id, first_name, last_name, handicap, group_number, group_position")
        .eq("tournament_id", selectedTournament)
        .order("last_name");
      if (error) throw error;
      return data as Registration[];
    },
    enabled: !!selectedTournament,
  });

  const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + mins;
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${rh.toString().padStart(2, "0")}:${rm.toString().padStart(2, "0")}`;
  };

  const formatTime12 = (time: string): string => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const generateTeeSheet = async (sortBy: "handicap" | "random") => {
    if (!registrations || registrations.length === 0) {
      toast({ title: "No players", description: "Register players first.", variant: "destructive" });
      return;
    }
    if (demoGuard()) return;
    setGenerating(true);

    // Sort players
    let sorted = [...registrations];
    if (sortBy === "handicap") {
      sorted.sort((a, b) => (a.handicap ?? 99) - (b.handicap ?? 99));
    } else {
      // Fisher-Yates shuffle
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
    }

    // Create groups
    const groups: TeeGroup[] = [];
    let groupNum = 1;
    for (let i = 0; i < sorted.length; i += groupSize) {
      const players = sorted.slice(i, i + groupSize);
      const teeTime = startFormat === "shotgun"
        ? firstTeeTime
        : addMinutes(firstTeeTime, (groupNum - 1) * interval);
      const expectedFinish = addMinutes(teeTime, paceMinutes);

      groups.push({
        number: groupNum,
        players,
        teeTime,
        cartNumber: groupNum,
        expectedFinish,
      });
      groupNum++;
    }

    // Save assignments to DB
    for (const g of groups) {
      for (let idx = 0; idx < g.players.length; idx++) {
        await supabase
          .from("tournament_registrations")
          .update({ group_number: g.number, group_position: idx + 1 })
          .eq("id", g.players[idx].id);
      }
    }
    setTeeGroups(groups);
    setGenerating(false);
    toast({ title: "Tee sheet generated!", description: `${groups.length} groups created with ${sorted.length} players.` });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (teeGroups.length === 0) return;
    const headers = ["Group", "Tee Time", "Cart #", "Player", "Handicap", "Expected Finish"];
    const rows: string[][] = [];
    teeGroups.forEach((g) => {
      g.players.forEach((p) => {
        rows.push([
          g.number.toString(),
          formatTime12(g.teeTime),
          g.cartNumber.toString(),
          `${p.first_name} ${p.last_name}`,
          p.handicap?.toString() || "N/A",
          formatTime12(g.expectedFinish),
        ]);
      });
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tee-sheet.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (orgLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tee Sheet & Start Calculator</h1>
        <p className="text-muted-foreground">Auto-assign groups and generate printable tee sheets.</p>
      </div>

      <Select value={selectedTournament} onValueChange={(v) => { setSelectedTournament(v); setTeeGroups([]); }}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a tournament" />
        </SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedTournament ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Select a tournament to generate a tee sheet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Settings */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Tee Sheet Settings</CardTitle>
              <CardDescription>Configure start format, timing, and group size.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Format</Label>
                  <Select value={startFormat} onValueChange={(v) => setStartFormat(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shotgun">Shotgun Start</SelectItem>
                      <SelectItem value="tee_times">Tee Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{startFormat === "shotgun" ? "Start Time" : "First Tee Time"}</Label>
                  <Input type="time" value={firstTeeTime} onChange={(e) => setFirstTeeTime(e.target.value)} />
                </div>
                {startFormat === "tee_times" && (
                  <div className="space-y-2">
                    <Label>Interval (minutes)</Label>
                    <Input type="number" min={5} max={30} value={interval} onChange={(e) => setInterval(parseInt(e.target.value) || 10)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Group Size</Label>
                  <Select value={groupSize.toString()} onValueChange={(v) => setGroupSize(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2-Person</SelectItem>
                      <SelectItem value="3">3-Person</SelectItem>
                      <SelectItem value="4">4-Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pace of Play (minutes for 18)</Label>
                  <Input type="number" min={120} max={360} value={paceMinutes} onChange={(e) => setPaceMinutes(parseInt(e.target.value) || 240)} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={() => generateTeeSheet("handicap")} disabled={generating || regLoading}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownAZ className="h-4 w-4 mr-2" />}
                  Group by Handicap
                </Button>
                <Button variant="outline" onClick={() => generateTeeSheet("random")} disabled={generating || regLoading}>
                  <Shuffle className="h-4 w-4 mr-2" /> Random Groups
                </Button>
              </div>

              {registrations && (
                <p className="text-sm text-muted-foreground mt-3">
                  {registrations.length} players registered • {Math.ceil(registrations.length / groupSize)} groups
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tee Sheet Display */}
          {teeGroups.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Tee Sheet
                    <Badge variant="secondary" className="ml-2">
                      {startFormat === "shotgun" ? "Shotgun Start" : "Tee Times"}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <Download className="h-4 w-4 mr-1.5" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-1.5" /> Print
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">
                          {startFormat === "shotgun" ? "Hole" : "Group"}
                        </TableHead>
                        <TableHead className="w-24">Tee Time</TableHead>
                        <TableHead className="w-16">Cart #</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead className="w-28">Est. Finish</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teeGroups.map((g) => (
                        <TableRow key={g.number}>
                          <TableCell className="font-bold">{g.number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{formatTime12(g.teeTime)}</Badge>
                          </TableCell>
                          <TableCell>{g.cartNumber}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {g.players.map((p) => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {p.first_name} {p.last_name}
                                  </span>
                                  {p.handicap != null && (
                                    <span className="text-xs text-muted-foreground">
                                      (HC: {p.handicap})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatTime12(g.expectedFinish)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span><strong>{teeGroups.length}</strong> groups</span>
                  <span><strong>{teeGroups.reduce((s, g) => s + g.players.length, 0)}</strong> players</span>
                  <span>First tee: <strong>{formatTime12(teeGroups[0]?.teeTime)}</strong></span>
                  <span>Last group finishes: <strong>{formatTime12(teeGroups[teeGroups.length - 1]?.expectedFinish)}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}