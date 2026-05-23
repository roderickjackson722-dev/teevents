import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Search } from "lucide-react";

interface AuditRow {
  id: string;
  occurred_at: string;
  user_id: string | null;
  user_email: string | null;
  organization_id: string | null;
  table_name: string;
  row_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

const PAGE_SIZE = 50;

const actionColor = (a: string) =>
  a === "INSERT" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  : a === "UPDATE" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
  : "bg-destructive/15 text-destructive";

export default function AdminAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState<string>("all");
  const [table, setTable] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<string>("7");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tables, setTables] = useState<string[]>([]);

  const fetchRows = async () => {
    setLoading(true);
    let q = supabase
      .from("dashboard_audit_log" as any)
      .select("*", { count: "exact" })
      .order("occurred_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (days !== "all") {
      const since = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
      q = q.gte("occurred_at", since);
    }
    if (action !== "all") q = q.eq("action", action);
    if (table !== "all") q = q.eq("table_name", table);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`user_email.ilike.%${s}%,row_id.ilike.%${s}%`);
    }

    const { data, count, error } = await q;
    if (!error) {
      setRows((data as any) || []);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase
      .from("dashboard_audit_log" as any)
      .select("table_name")
      .limit(1000)
      .then(({ data }) => {
        const uniq = Array.from(new Set(((data as any) || []).map((r: any) => r.table_name))).sort() as string[];
        setTables(uniq);
      });
  }, []);

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [page, action, table, days]);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    n.has(id) ? n.delete(id) : n.add(id);
    setExpanded(n);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Every create, edit, and delete made on the organizer dashboard. Admin-only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Search email or row id</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(0), fetchRows())}
              placeholder="user@example.com or row id" className="pl-8" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Action</label>
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
          <label className="text-xs text-muted-foreground">Table</label>
          <Select value={table} onValueChange={(v) => { setTable(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">All tables</SelectItem>
              {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
        {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No activity in this range.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2">When</th>
                <th className="p-2">User</th>
                <th className="p-2">Action</th>
                <th className="p-2">Table</th>
                <th className="p-2">Row ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <>
                  <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => toggle(r.id)}>
                    <td className="p-2">{expanded.has(r.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                    <td className="p-2 whitespace-nowrap">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="p-2">{r.user_email || <span className="text-muted-foreground italic">system</span>}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor(r.action)}`}>{r.action}</span></td>
                    <td className="p-2 font-mono text-xs">{r.table_name}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground truncate max-w-[200px]">{r.row_id}</td>
                  </tr>
                  {expanded.has(r.id) && (
                    <tr key={r.id + "-d"} className="bg-muted/20 border-t">
                      <td colSpan={6} className="p-3">
                        {r.action === "UPDATE" && r.changed_fields ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Changed fields</div>
                            {Object.entries(r.changed_fields).map(([k, v]) => (
                              <div key={k} className="grid grid-cols-[160px_1fr_1fr] gap-2 text-xs">
                                <div className="font-mono font-medium">{k}</div>
                                <div className="text-destructive truncate"><span className="text-muted-foreground">old:</span> {JSON.stringify(v.old)}</div>
                                <div className="text-emerald-700 dark:text-emerald-300 truncate"><span className="text-muted-foreground">new:</span> {JSON.stringify(v.new)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre className="text-xs overflow-auto max-h-[400px] bg-background p-2 rounded">
{JSON.stringify(r.new_values || r.old_values, null, 2)}
                          </pre>
                        )}
                        {r.organization_id && (
                          <div className="text-xs text-muted-foreground mt-2">Org: <span className="font-mono">{r.organization_id}</span></div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page + 1} of {pages}</span>
        <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
