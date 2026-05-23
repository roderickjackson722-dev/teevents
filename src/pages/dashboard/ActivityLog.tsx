import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Search, LogIn, Activity } from "lucide-react";

interface AuditRow {
  id: string;
  occurred_at: string;
  user_email: string | null;
  table_name: string;
  row_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  kind: "change";
}
interface LoginRow {
  id: string;
  occurred_at: string;
  user_email: string | null;
  user_agent: string | null;
  kind: "login";
}
type Row = AuditRow | LoginRow;

const PAGE_SIZE = 50;

const actionColor = (a: string) =>
  a === "INSERT" ? "bg-emerald-500/15 text-emerald-700"
  : a === "UPDATE" ? "bg-amber-500/15 text-amber-700"
  : a === "DELETE" ? "bg-destructive/15 text-destructive"
  : "bg-blue-500/15 text-blue-700";

const friendlyTable = (t: string) =>
  t.replace(/^tournament_/, "").replace(/_/g, " ");

export default function ActivityLog() {
  const orgContext = useOrgContext();
  const orgId = orgContext?.orgId;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchRows = async () => {
    if (!orgId) return;
    setLoading(true);
    const since = days === "all" ? null : new Date(Date.now() - parseInt(days) * 86400000).toISOString();

    const out: Row[] = [];

    if (kind === "all" || kind === "change") {
      let q = supabase.from("dashboard_audit_log" as any)
        .select("id,occurred_at,user_email,table_name,row_id,action,changed_fields,old_values,new_values")
        .eq("organization_id", orgId)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (since) q = q.gte("occurred_at", since);
      if (action !== "all") q = q.eq("action", action);
      const { data } = await q;
      (data || []).forEach((r: any) => out.push({ ...r, kind: "change" }));
    }

    if (kind === "all" || kind === "login") {
      let q = supabase.from("org_login_events" as any)
        .select("id,occurred_at,user_email,user_agent")
        .eq("organization_id", orgId)
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (since) q = q.gte("occurred_at", since);
      const { data } = await q;
      (data || []).forEach((r: any) => out.push({ ...r, kind: "login" }));
    }

    out.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    const filtered = search.trim()
      ? out.filter((r) => (r.user_email || "").toLowerCase().includes(search.trim().toLowerCase())
          || (r.kind === "change" && (r.table_name.includes(search.trim().toLowerCase()) || (r.row_id || "").includes(search.trim()))))
      : out;

    setRows(filtered);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [orgId, days, kind, action]);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Activity className="h-7 w-7" /> Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Every sign-in and dashboard change made by anyone on your team. We track who, what, and when so you have a clear paper trail.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Search by email or item</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRows()}
              placeholder="user@example.com" className="pl-8" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={kind} onValueChange={(v) => { setKind(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All activity</SelectItem>
              <SelectItem value="login">Sign-ins only</SelectItem>
              <SelectItem value="change">Edits only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Edit type</label>
          <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="INSERT">Create</SelectItem>
              <SelectItem value="UPDATE">Edit</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Time range</label>
          <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => { setPage(0); fetchRows(); }}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {rows.length.toLocaleString()} {rows.length === 1 ? "entry" : "entries"}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : pageRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No activity in this range.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2">When</th>
                <th className="p-2">User</th>
                <th className="p-2">Activity</th>
                <th className="p-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className={`border-t hover:bg-muted/30 ${r.kind === "change" ? "cursor-pointer" : ""}`}
                    onClick={() => r.kind === "change" && toggle(r.id)}
                  >
                    <td className="p-2">
                      {r.kind === "change"
                        ? (expanded.has(r.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)
                        : <LogIn className="h-4 w-4 text-blue-600" />}
                    </td>
                    <td className="p-2 whitespace-nowrap">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="p-2">{r.user_email || <span className="text-muted-foreground italic">system</span>}</td>
                    <td className="p-2">
                      {r.kind === "login" ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor("LOGIN")}`}>Signed in</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(r.action)}`}>{r.action === "INSERT" ? "Created" : r.action === "UPDATE" ? "Edited" : "Deleted"}</span>
                      )}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.kind === "change" ? friendlyTable(r.table_name) : (r.user_agent || "—")}
                    </td>
                  </tr>
                  {r.kind === "change" && expanded.has(r.id) && (
                    <tr className="bg-muted/20 border-t">
                      <td colSpan={5} className="p-3">
                        {r.action === "UPDATE" && r.changed_fields ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Changed fields</div>
                            {Object.entries(r.changed_fields).map(([k, v]) => (
                              <div key={k} className="grid grid-cols-[160px_1fr_1fr] gap-2 text-xs">
                                <div className="font-mono font-medium">{k}</div>
                                <div className="text-destructive truncate"><span className="text-muted-foreground">old:</span> {JSON.stringify(v.old)}</div>
                                <div className="text-emerald-700 truncate"><span className="text-muted-foreground">new:</span> {JSON.stringify(v.new)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="text-xs overflow-auto max-h-[400px] bg-background p-2 rounded">
{JSON.stringify(r.new_values || r.old_values, null, 2)}
                          </pre>
                        )}
                        {r.row_id && <div className="text-xs text-muted-foreground mt-2">Row: <span className="font-mono">{r.row_id}</span></div>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
        <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
