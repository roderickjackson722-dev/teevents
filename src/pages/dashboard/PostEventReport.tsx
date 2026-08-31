import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, FileText, Download, Users, DollarSign, Trophy, Award } from "lucide-react";
import { pickTournamentId } from "@/hooks/useTournamentIdParam";
import { formatCents } from "@/lib/formatCurrency";
import { toast } from "sonner";
import { buildLeaderboard } from "@/lib/liveLeaderboardRows";

interface TournamentRow {
  id: string;
  title: string;
  date: string | null;
  course_name: string | null;
  scoring_format: string | null;
  course_par: number | null;
  hole_pars: number[] | null;
}

interface LeaderRow {
  name: string;
  holesPlayed: number;
  strokes: number;
  toPar: number | null;
}

interface SponsorRow {
  name: string;
  tier: string | null;
  amount: number | null;
  is_paid: boolean | null;
}

const PostEventReport = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [regs, setRegs] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [sponsorRegs, setSponsorRegs] = useState<{ count: number; pledged: number; collected: number }>({
    count: 0, pledged: 0, collected: 0,
  });

  const tournament = tournaments.find((t) => t.id === selected) || null;

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date, course_name, scoring_format, course_par, hole_pars")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = ((data || []) as unknown as TournamentRow[]);
        setTournaments(t);
        if (t.length > 0) setSelected(pickTournamentId(t as any));
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selected || !org) return;
    setLoading(true);
    const t = tournaments.find((x) => x.id === selected) || null;
    Promise.all([
      supabase.from("tournament_registrations").select("*").eq("tournament_id", selected),
      supabase.from("platform_transactions").select("*").eq("tournament_id", selected),
      supabase
        .from("tournament_scores")
        .select("registration_id, hole_number, strokes, round_number")
        .eq("tournament_id", selected),
      supabase.from("tournament_sponsors").select("name, tier, amount, is_paid").eq("tournament_id", selected),
      supabase
        .from("sponsor_registrations")
        .select("company_name, tier_name, amount_cents, payment_status")
        .eq("tournament_id", selected),
    ]).then(([regRes, txRes, scoreRes, sponRes, sponRegRes]) => {
      const registrations = (regRes.data || []) as any[];
      setRegs(registrations);
      setTx((txRes.data || []) as any[]);

      // Sponsors: manual roster plus anything that came through public sponsor registration.
      const manual = (sponRes.data || []) as unknown as SponsorRow[];
      const sponsorRegistrations = (sponRegRes.data || []) as any[];
      const active = sponsorRegistrations.filter(
        (r) => !["refunded", "cancelled", "failed"].includes(String(r.payment_status || "").toLowerCase()),
      );
      setSponsorRegs({
        count: active.length,
        pledged: active.reduce((n, r) => n + Number(r.amount_cents || 0), 0) / 100,
        collected:
          active
            .filter((r) => String(r.payment_status || "").toLowerCase() === "paid")
            .reduce((n, r) => n + Number(r.amount_cents || 0), 0) / 100,
      });
      const manualNames = new Set(manual.map((m) => String(m.name || "").trim().toLowerCase()));
      const fromRegs: SponsorRow[] = active
        .filter((r) => !manualNames.has(String(r.company_name || "").trim().toLowerCase()))
        .map((r) => ({
          name: r.company_name || "Sponsor",
          tier: r.tier_name || null,
          amount: Number(r.amount_cents || 0) / 100,
          is_paid: String(r.payment_status || "").toLowerCase() === "paid",
        }));
      setSponsors([...manual, ...fromRegs]);

      const nameById = new Map<string, string>();
      registrations.forEach((r) => {
        nameById.set(
          r.id,
          r.player_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Player",
        );
      });
      // Use the same engine as the live leaderboard so standings match exactly.
      const scoresData = ((scoreRes.data || []) as any[]).map((s2) => ({
        ...s2,
        tournament_registrations: (() => {
          const reg = registrations.find((r) => r.id === s2.registration_id);
          return reg
            ? {
                first_name: reg.first_name,
                last_name: reg.last_name,
                group_number: reg.group_number ?? null,
                team_name: reg.team_name ?? null,
              }
            : null;
        })(),
      }));
      const built = buildLeaderboard(scoresData, {
        scoring_format: t?.scoring_format || "stroke_play",
        course_par: t?.course_par || 72,
      } as any, t?.hole_pars || null);
      const rows: LeaderRow[] = built.map((r: any) => ({
        name: r.name || nameById.get(r.registration_id) || "Player",
        holesPlayed: Number(r.thru) || 0,
        strokes: Number(r.total) || 0,
        toPar: r.parPlayed != null ? Number(r.total) - Number(r.parPlayed) : null,
      }));
      setLeaders(rows);
      setLoading(false);
    });
  }, [selected, org, tournaments]);

  const finance = useMemo(() => {
    const paid = tx.filter((t) => ["paid", "succeeded", "completed"].includes(String(t.status).toLowerCase()));
    const gross = paid.reduce((s, t) => s + (t.amount_cents || 0), 0);
    const platformFee = paid.reduce((s, t) => s + (t.platform_fee_cents || 0), 0);
    const stripeFee = paid.reduce((s, t) => s + (t.stripe_fee_cents || 0), 0);
    const net = paid.reduce((s, t) => s + (t.net_amount_cents || 0), 0);
    const byType = new Map<string, number>();
    paid.forEach((t) => byType.set(t.type || "other", (byType.get(t.type || "other") || 0) + (t.amount_cents || 0)));
    return { gross, platformFee, stripeFee, net, count: paid.length, byType: Array.from(byType.entries()) };
  }, [tx]);

  const registration = useMemo(() => {
    const total = regs.length;
    const paidCount = regs.filter((r) =>
      ["paid", "succeeded", "completed"].includes(String(r.payment_status || "").toLowerCase()),
    ).length;
    const teams = new Set(regs.map((r) => r.group_id || r.team_name).filter(Boolean)).size;
    return { total, paidCount, unpaid: total - paidCount, teams };
  }, [regs]);

  const sponsorTotal = sponsors.reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const downloadCsv = () => {
    if (!tournament) return;
    const lines: string[] = [];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    lines.push("Section,Metric,Value");
    lines.push(["Overview", "Tournament", tournament.title].map(esc).join(","));
    lines.push(["Overview", "Date", tournament.date || "—"].map(esc).join(","));
    lines.push(["Overview", "Course", tournament.course_name || "—"].map(esc).join(","));
    lines.push(["Overview", "Format", tournament.scoring_format || "—"].map(esc).join(","));
    lines.push(["Registration", "Total registrations", registration.total].map(esc).join(","));
    lines.push(["Registration", "Paid registrations", registration.paidCount].map(esc).join(","));
    lines.push(["Registration", "Unpaid registrations", registration.unpaid].map(esc).join(","));
    lines.push(["Registration", "Teams/Groups", registration.teams].map(esc).join(","));
    lines.push(["Finances", "Gross collected", formatCents(finance.gross)].map(esc).join(","));
    lines.push(["Finances", "Platform fees", formatCents(finance.platformFee)].map(esc).join(","));
    lines.push(["Finances", "Processing fees", formatCents(finance.stripeFee)].map(esc).join(","));
    lines.push(["Finances", "Net to organizer", formatCents(finance.net)].map(esc).join(","));
    finance.byType.forEach(([type, cents]) =>
      lines.push(["Finances", `Revenue — ${type}`, formatCents(cents)].map(esc).join(",")),
    );
    lines.push("");
    lines.push("Leaderboard Position,Player,Holes Played,Strokes,To Par");
    leaders.forEach((l, i) =>
      lines.push([i + 1, l.name, l.holesPlayed, l.strokes, l.toPar ?? "—"].map(esc).join(",")),
    );
    lines.push("");
    lines.push(["Sponsors", "Registrations", sponsorRegs.count].map(esc).join(","));
    lines.push(["Sponsors", "Pledged", `$${sponsorRegs.pledged.toLocaleString()}`].map(esc).join(","));
    lines.push(["Sponsors", "Collected", `$${sponsorRegs.collected.toLocaleString()}`].map(esc).join(","));
    lines.push("");
    lines.push("Sponsor,Tier,Amount,Paid");
    sponsors.forEach((s) =>
      lines.push([s.name, s.tier || "—", s.amount ?? "—", s.is_paid ? "Yes" : "No"].map(esc).join(",")),
    );

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `post-event-report-${tournament.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPdf = async () => {
    if (!tournament) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      let y = 56;
      const line = (text: string, size = 11, bold = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.text(text, 48, y);
        y += size + 8;
        if (y > 720) { doc.addPage(); y = 56; }
      };
      line("Post-Tournament Report", 18, true);
      line(tournament.title, 13, true);
      line(`${tournament.date || "Date TBD"} · ${tournament.course_name || "Course TBD"}`);
      y += 8;
      line("Event Overview", 13, true);
      line(`Format: ${tournament.scoring_format || "—"}   Par: ${tournament.course_par ?? "—"}`);
      y += 8;
      line("Registration", 13, true);
      line(`Total registrations: ${registration.total}`);
      line(`Paid: ${registration.paidCount}    Unpaid: ${registration.unpaid}    Teams/Groups: ${registration.teams}`);
      y += 8;
      line("Finances", 13, true);
      line(`Gross collected: ${formatCents(finance.gross)}   (${finance.count} transactions)`);
      line(`Platform fees: ${formatCents(finance.platformFee)}    Processing fees: ${formatCents(finance.stripeFee)}`);
      line(`Net to organizer: ${formatCents(finance.net)}`);
      finance.byType.forEach(([type, cents]) => line(`  ${type}: ${formatCents(cents)}`));
      y += 8;
      line("Leaderboard (Top 20)", 13, true);
      leaders.slice(0, 20).forEach((l, i) =>
        line(`${i + 1}. ${l.name} — ${l.strokes} strokes (${l.holesPlayed} holes)${l.toPar != null ? `, ${l.toPar > 0 ? "+" : ""}${l.toPar} to par` : ""}`),
      );
      if (leaders.length === 0) line("No scores recorded.");
      y += 8;
      line("Sponsors", 13, true);
      sponsors.forEach((s) => line(`${s.name}${s.tier ? ` — ${s.tier}` : ""}${s.amount ? ` — $${s.amount}` : ""}${s.is_paid ? " (paid)" : ""}`));
      if (sponsors.length === 0) line("No sponsors recorded.");
      else line(`Total sponsorship value: $${sponsorTotal.toLocaleString()}`, 11, true);
      doc.save(`post-event-report-${tournament.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
    } catch (e: any) {
      toast.error(e?.message || "Could not generate PDF");
    }
  };

  if (loading && tournaments.length === 0) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Post-Tournament Report
          </h1>
          <p className="text-sm text-muted-foreground">
            A complete recap of your event: attendance, revenue, results, and sponsors.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCsv} disabled={!tournament}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button onClick={downloadPdf} disabled={!tournament}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {tournaments.length > 1 && (
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="max-w-sm"><SelectValue placeholder="Select tournament" /></SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !tournament ? (
        <p className="text-sm text-muted-foreground italic">No tournaments yet.</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Event Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Date</p><p className="font-semibold">{tournament.date || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Course</p><p className="font-semibold">{tournament.course_name || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Format</p><p className="font-semibold">{tournament.scoring_format || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Course Par</p><p className="font-semibold">{tournament.course_par ?? "—"}</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Registration</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{registration.total}</p></div>
                <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-2xl font-bold">{registration.paidCount}</p></div>
                <div><p className="text-xs text-muted-foreground">Unpaid</p><p className="text-2xl font-bold">{registration.unpaid}</p></div>
                <div><p className="text-xs text-muted-foreground">Teams / Groups</p><p className="text-2xl font-bold">{registration.teams}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Finances</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gross collected</span><span className="font-semibold">{formatCents(finance.gross)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform fees</span><span>{formatCents(finance.platformFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Processing fees</span><span>{formatCents(finance.stripeFee)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">Net to organizer</span><span className="font-bold">{formatCents(finance.net)}</span></div>
                {finance.byType.map(([type, cents]) => (
                  <div key={type} className="flex justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{String(type).replace(/_/g, " ")}</span><span>{formatCents(cents)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Final Leaderboard</CardTitle></CardHeader>
            <CardContent>
              {leaders.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No scores recorded for this event.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>#</TableHead><TableHead>Player</TableHead><TableHead>Holes</TableHead><TableHead>Strokes</TableHead><TableHead>To Par</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaders.slice(0, 25).map((l, i) => (
                      <TableRow key={`${l.name}-${i}`}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{l.name}</TableCell>
                        <TableCell>{l.holesPlayed}</TableCell>
                        <TableCell>{l.strokes}</TableCell>
                        <TableCell>{l.toPar == null ? "—" : `${l.toPar > 0 ? "+" : ""}${l.toPar}`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Sponsors</CardTitle></CardHeader>
            <CardContent>
              {sponsors.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No sponsors recorded.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Sponsor</TableHead><TableHead>Tier</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {sponsors.map((s, i) => (
                        <TableRow key={`${s.name}-${i}`}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.tier || "—"}</TableCell>
                          <TableCell>{s.amount ? `$${Number(s.amount).toLocaleString()}` : "—"}</TableCell>
                          <TableCell>{s.is_paid ? "Yes" : "No"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="text-sm mt-3 font-semibold">Total sponsorship value: ${sponsorTotal.toLocaleString()}</p>
                  {sponsorRegs.count > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {sponsorRegs.count} sponsor registration{sponsorRegs.count === 1 ? "" : "s"} · pledged $
                      {sponsorRegs.pledged.toLocaleString()} · collected ${sponsorRegs.collected.toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PostEventReport;
