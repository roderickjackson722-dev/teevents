import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { listVettingSignups } from "@/lib/vetting.functions";

const COLS: [string, (r: any) => string][] = [
  ["Submitted", (r) => new Date(r.signup_date || r.created_at).toLocaleString()],
  ["Name", (r) => r.full_legal_name || r.full_name || ""],
  ["Email", (r) => r.email || ""],
  ["Phone", (r) => r.phone_number || r.phone || ""],
  ["Organization", (r) => r.organization_name || ""],
  ["Website", (r) => r.organization_website || ""],
  ["Role", (r) => r.role || ""],
  ["Events/12mo", (r) => r.events_per_year || ""],
  ["Paid regs", (r) => (r.paid_registrations == null ? "" : r.paid_registrations ? "Yes" : "No")],
  ["Heard via", (r) => r.referral_source || r.heard_from || ""],
  ["Email verified", (r) => (r.email_verified ? "Yes" : "No")],
  ["Status", (r) => r.vetting_status || ""],
  ["IP", (r) => r.ip_address || ""],
  ["Description", (r) => r.event_description || ""],
];

export default function AdminSiteRegistrations() {
  const list = useServerFn(listVettingSignups);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    list().then(setRows).catch((e: any) => toast.error(e?.message || "Could not load")).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => COLS.some(([, g]) => g(r).toLowerCase().includes(s))) : rows;
  }, [rows, q]);

  const csv = () => {
    const e = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = [COLS.map(([h]) => e(h)).join(","), ...filtered.map((r) => COLS.map(([, g]) => e(g(r))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = `site-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Site Registrations</h2>
          <p className="text-sm text-muted-foreground">Everyone who has signed up for a TeeVents account ({rows.length} total).</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={csv}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{COLS.map(([h]) => <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  {COLS.map(([h, g]) => (
                    <td key={h} className={`px-3 py-2 ${h === "Description" ? "min-w-[240px]" : "whitespace-nowrap"}`}>
                      {h === "Status" ? <Badge variant="outline" className="capitalize">{g(r) || "—"}</Badge> : g(r) || "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={COLS.length} className="text-center py-8 text-muted-foreground">No registrations found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
