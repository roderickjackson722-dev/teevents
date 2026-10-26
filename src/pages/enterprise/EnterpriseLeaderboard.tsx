import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import EnterpriseLayout from "@/components/enterprise/EnterpriseLayout";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { enterpriseLink, enterpriseLeagueManageLink } from "@/lib/enterpriseNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

interface Row {
  key: string;
  kind: "Tournament" | "League";
  id: string;
  name: string;
  date: string | null;
  course: string | null;
  status: string;
}

function fmtDate(d: string | null) {
  if (!d) return "Date not set";
  const dt = new Date(`${d.slice(0, 10)}T12:00:00`);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Enterprise Leaderboard list: read-only index of Enterprise tournaments and leagues. */
export default function EnterpriseLeaderboard() {
  const { org } = useOrgContext();
  const { search } = useLocation();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!org) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: l }] = await Promise.all([
        (supabase.from("tournaments") as any)
          .select("id, title, date, course_name, status")
          .eq("organization_id", org.orgId)
          .eq("is_enterprise", true)
          .order("date", { ascending: false, nullsFirst: false }),
        (supabase.from("golf_leagues") as any)
          .select("id, league_name, start_date, publish_status, is_active")
          .eq("organization_id", org.orgId)
          .order("start_date", { ascending: false, nullsFirst: false }),
      ]);
      const leagues = (l || []) as any[];
      const courses: Record<string, string> = {};
      if (leagues.length) {
        const { data: ev } = await (supabase.from("league_events") as any)
          .select("league_id, course_name, event_date")
          .in("league_id", leagues.map((x) => x.id))
          .order("event_date", { ascending: true });
        for (const e of (ev || []) as any[]) if (e.course_name && !courses[e.league_id]) courses[e.league_id] = e.course_name;
      }
      if (!alive) return;
      setRows([
        ...((t || []) as any[]).map((x) => ({
          key: `t-${x.id}`, kind: "Tournament" as const, id: x.id, name: x.title || "Untitled Event",
          date: x.date, course: x.course_name, status: x.status || "draft",
        })),
        ...leagues.map((x) => ({
          key: `l-${x.id}`, kind: "League" as const, id: x.id, name: x.league_name || "Untitled League",
          date: x.start_date, course: courses[x.id] || null,
          status: x.publish_status || (x.is_active ? "active" : "inactive"),
        })),
      ]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [org]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.name, r.course, r.status, r.kind].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);

  const viewLink = (r: Row) =>
    r.kind === "Tournament"
      ? enterpriseLink(`/enterprise/leaderboard/view?tournament_id=${r.id}`, search)
      : `${enterpriseLeagueManageLink(r.id, search)}${enterpriseLeagueManageLink(r.id, search).includes("?") ? "&" : "?"}tab=standings`;
  const scoresLink = (r: Row) =>
    r.kind === "Tournament"
      ? enterpriseLink(`/enterprise/scores?tournament_id=${r.id}`, search)
      : `${enterpriseLeagueManageLink(r.id, search)}${enterpriseLeagueManageLink(r.id, search).includes("?") ? "&" : "?"}tab=scoring`;

  return (
    <EnterpriseLayout
      title="Leaderboard"
      description="Leaderboards for every Enterprise tournament and league."
      crumbs={[{ label: "Leaderboard" }]}
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" aria-label="Search events" className="pl-9" />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{rows.length ? "No events match your search." : "No Enterprise tournaments or leagues yet."}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.key} data-testid="leaderboard-row">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="outline">{r.kind}</Badge>
                    <Badge variant="secondary" className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{fmtDate(r.date)} · {r.course || "Course not set"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm"><Link to={scoresLink(r)}>Enter scores</Link></Button>
                  <Button asChild size="sm"><Link to={viewLink(r)}>View leaderboard</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </EnterpriseLayout>
  );
}
