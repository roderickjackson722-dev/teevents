import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, FileDown, Trophy, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTournamentIdParam } from "@/hooks/useTournamentIdParam";
import { useOrgContext } from "@/hooks/useOrgContext";
import SEO from "@/components/SEO";
import { openPrintWindow } from "@/components/printables/printUtils";
import { formatTournamentDate } from "@/lib/formatDate";

type Depth = "front" | "middle" | "back" | "";
type Side = "left" | "center" | "right" | "";

interface PinRow {
  hole_number: number;
  depth_position: Depth;
  side_position: Side;
  distance_from_front: string;
  distance_from_left: string;
  notes: string;
}

const empty = (n: number): PinRow => ({
  hole_number: n,
  depth_position: "",
  side_position: "",
  distance_from_front: "",
  distance_from_left: "",
  notes: "",
});

const DEFAULT_ROWS: PinRow[] = Array.from({ length: 18 }, (_, i) => empty(i + 1));

export default function PinSheets() {
  const queryClient = useQueryClient();
  const { org } = useOrgContext();
  const [tournamentId, setTournamentId] = useTournamentIdParam();

  const { data: tournaments } = useQuery({
    queryKey: ["pin-sheets-tournaments", org?.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, date, course_name, pin_sheets_enabled, pin_sheets_notes, slug")
        .eq("organization_id", org!.orgId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!org,
  });

  useEffect(() => {
    if (tournaments && tournaments.length > 0 && !tournaments.some((t) => t.id === tournamentId)) {
      setTournamentId(tournaments[0].id);
    }
  }, [tournaments, tournamentId]);

  const tournament = useMemo(() => tournaments?.find((t) => t.id === tournamentId), [tournaments, tournamentId]);

  const { data: course } = useQuery({
    queryKey: ["pin-sheets-course", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("golf_courses")
        .select("name, hole_pars, hole_distances")
        .eq("tournament_id", tournamentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const { data: placements } = useQuery({
    queryKey: ["pin-placements", tournamentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pin_placements")
        .select("*")
        .eq("tournament_id", tournamentId!)
        .order("hole_number");
      if (error) throw error;
      return data;
    },
    enabled: !!tournamentId,
  });

  const [enabled, setEnabled] = useState(false);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<PinRow[]>(DEFAULT_ROWS);

  useEffect(() => {
    setEnabled(!!tournament?.pin_sheets_enabled);
    setNotes(tournament?.pin_sheets_notes || "");
  }, [tournament]);

  useEffect(() => {
    if (placements) {
      const map = new Map<number, any>();
      placements.forEach((p: any) => map.set(p.hole_number, p));
      setRows(
        Array.from({ length: 18 }, (_, i) => {
          const h = i + 1;
          const p = map.get(h);
          return p
            ? {
                hole_number: h,
                depth_position: (p.depth_position || "") as Depth,
                side_position: (p.side_position || "") as Side,
                distance_from_front: p.distance_from_front != null ? String(p.distance_from_front) : "",
                distance_from_left: p.distance_from_left != null ? String(p.distance_from_left) : "",
                notes: p.notes || "",
              }
            : empty(h);
        })
      );
    }
  }, [placements]);

  const update = (idx: number, patch: Partial<PinRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("tournaments")
        .update({ pin_sheets_enabled: enabled, pin_sheets_notes: notes || null } as any)
        .eq("id", tournamentId!);

      const payload = rows.map((r) => ({
        tournament_id: tournamentId!,
        hole_number: r.hole_number,
        depth_position: r.depth_position || null,
        side_position: r.side_position || null,
        distance_from_front: r.distance_from_front ? parseInt(r.distance_from_front) : null,
        distance_from_left: r.distance_from_left ? parseInt(r.distance_from_left) : null,
        notes: r.notes || null,
      }));

      const { error } = await (supabase as any)
        .from("pin_placements")
        .upsert(payload, { onConflict: "tournament_id,hole_number" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pin placements saved!" });
      queryClient.invalidateQueries({ queryKey: ["pin-placements", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["pin-sheets-tournaments", org?.orgId] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const generatePdf = () => {
    if (!tournament) return;
    const pars = (course?.hole_pars as number[] | null) || [];
    const dists = (course?.hole_distances as number[] | null) || [];
    const dateStr = formatTournamentDate(tournament.date);
    const tournamentUrl = `${window.location.origin}/t/${tournament.slug}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(tournamentUrl)}`;

    const rowsHtml = rows
      .map((r) => {
        const depth = r.depth_position ? r.depth_position[0].toUpperCase() + r.depth_position.slice(1) : "—";
        const side = r.side_position ? r.side_position[0].toUpperCase() + r.side_position.slice(1) : "—";
        const pos = r.depth_position || r.side_position ? `${depth} ${side}` : "—";
        const extra: string[] = [];
        if (r.distance_from_front) extra.push(`${r.distance_from_front} yds from front`);
        if (r.distance_from_left) extra.push(`${r.distance_from_left} yds from left`);
        return `<tr>
          <td style="text-align:center;font-weight:600">${r.hole_number}</td>
          <td style="text-align:center">${pars[r.hole_number - 1] ?? "—"}</td>
          <td style="text-align:center">${dists[r.hole_number - 1] ? dists[r.hole_number - 1] : "—"}</td>
          <td>${pos}${extra.length ? `<div style="font-size:11px;color:#555">${extra.join(" · ")}</div>` : ""}</td>
          <td style="font-size:11px;color:#444">${r.notes || ""}</td>
        </tr>`;
      })
      .join("");

    const body = `
      <div style="font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; color:#1a1a1a;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1a5c38; padding-bottom:12px; margin-bottom:20px;">
          <div>
            <h1 style="margin:0; font-size:24px;">${tournament.title}</h1>
            <p style="margin:4px 0; color:#555;">${course?.name || tournament.course_name || ""}${dateStr ? ` · ${dateStr}` : ""}</p>
            <p style="margin:0; font-size:14px; color:#1a5c38; font-weight:600;">Pin Locations</p>
          </div>
          <div style="text-align:center;">
            <img src="${qrSrc}" alt="QR" style="width:90px;height:90px;" />
            <div style="font-size:10px;color:#666;margin-top:4px;">Live leaderboard</div>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#1a5c38;color:#fff;">
              <th style="padding:6px;text-align:center;width:50px;">Hole</th>
              <th style="padding:6px;text-align:center;width:50px;">Par</th>
              <th style="padding:6px;text-align:center;width:70px;">Yards</th>
              <th style="padding:6px;text-align:left;">Pin Position</th>
              <th style="padding:6px;text-align:left;">Notes</th>
            </tr>
          </thead>
          <tbody style="background:#fff;">
            ${rowsHtml.replace(/<tr>/g, '<tr style="border-bottom:1px solid #ddd;">')}
          </tbody>
        </table>
        ${notes ? `<div style="margin-top:20px; padding:12px; background:#f5f5f0; border-left:4px solid #F5A623;"><strong>Notes:</strong> ${notes}</div>` : ""}
        <p style="margin-top:24px; font-size:11px; color:#888; text-align:center;">Generated by TeeVents · ${tournamentUrl}</p>
      </div>
    `;
    openPrintWindow(`${tournament.title} - Pin Sheet`, body);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl">
      <SEO title="Pin Sheets" description="Create downloadable pin sheets for your tournament." />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-6 w-6 text-primary" /> Pin Sheets</h1>
          <p className="text-sm text-muted-foreground">Hole-by-hole pin locations for your tournament — downloadable PDF.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generatePdf} disabled={!tournamentId}>
            <FileDown className="h-4 w-4 mr-1" /> Generate Pin Sheet PDF
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!tournamentId || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Select Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments && tournaments.length > 0 ? (
            <Select
              value={tournamentId ?? ""}
              onValueChange={(v) => {
                setTournamentId(v);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select a tournament..." /></SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}{t.date ? ` — ${formatTournamentDate(t.date)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">Create a tournament first.</p>
          )}
        </CardContent>
      </Card>

      {tournamentId && (
        <>
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <Label className="text-base">Enable pin sheets for this tournament</Label>
                <p className="text-xs text-muted-foreground">When enabled, the pin sheet PDF can be shared with players.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pin Positions</CardTitle>
              <CardDescription>
                Course: {course?.name || tournament?.course_name || "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Hole</TableHead>
                      <TableHead className="w-36">Depth</TableHead>
                      <TableHead className="w-36">Side</TableHead>
                      <TableHead className="w-32">From Front (yds)</TableHead>
                      <TableHead className="w-32">From Left (yds)</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.hole_number}>
                        <TableCell className="font-semibold">{r.hole_number}</TableCell>
                        <TableCell>
                          <Select value={r.depth_position || "none"} onValueChange={(v) => update(idx, { depth_position: (v === "none" ? "" : v) as Depth })}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="front">Front</SelectItem>
                              <SelectItem value="middle">Middle</SelectItem>
                              <SelectItem value="back">Back</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={r.side_position || "none"} onValueChange={(v) => update(idx, { side_position: (v === "none" ? "" : v) as Side })}>
                            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="center">Center</SelectItem>
                              <SelectItem value="right">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={r.distance_from_front} onChange={(e) => update(idx, { distance_from_front: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={r.distance_from_left} onChange={(e) => update(idx, { distance_from_left: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input value={r.notes} onChange={(e) => update(idx, { notes: e.target.value })} placeholder="optional" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
              <CardDescription>Shown at the bottom of the PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Pins placed on the flattest areas. Use range finders for exact distances." />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
