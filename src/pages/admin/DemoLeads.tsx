import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

interface Lead {
  id: string;
  email: string;
  role: string | null;
  demo_started_at: string;
  demo_completed: boolean;
  demo_completed_at: string | null;
  demo_exited_at: string | null;
  last_step_index: number | null;
  feedback_score: number | null;
  feedback_text: string | null;
  feedback_reasons: string[] | null;
  signed_up_at: string | null;
  welcome_email_sent_at: string | null;
  followup_24h_sent_at: string | null;
  followup_7d_sent_at: string | null;
  created_at: string;
}

export default function DemoLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [completion, setCompletion] = useState<string>("all");
  const [signedUp, setSignedUp] = useState<string>("all");

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("demo_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      toast({ title: "Could not load leads", description: error.message, variant: "destructive" });
    } else {
      setLeads((data ?? []) as Lead[]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search && !l.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (completion === "completed" && !l.demo_completed) return false;
      if (completion === "exited" && !l.demo_exited_at) return false;
      if (completion === "no_feedback" && (l.feedback_text || l.feedback_score)) return false;
      if (signedUp === "yes" && !l.signed_up_at) return false;
      if (signedUp === "no" && l.signed_up_at) return false;
      return true;
    });
  }, [leads, search, completion, signedUp]);

  const exportCsv = () => {
    const headers = [
      "email", "role", "started_at", "completed", "completed_at", "last_step",
      "feedback_score", "feedback_reasons", "feedback_text",
      "welcome_sent", "followup_24h_sent", "followup_7d_sent", "signed_up_at",
    ];
    const rows = filtered.map((l) => [
      l.email,
      l.role ?? "",
      l.demo_started_at,
      l.demo_completed ? "yes" : "no",
      l.demo_completed_at ?? "",
      l.last_step_index ?? "",
      l.feedback_score ?? "",
      (l.feedback_reasons ?? []).join("; "),
      (l.feedback_text ?? "").replace(/"/g, '""'),
      l.welcome_email_sent_at ?? "",
      l.followup_24h_sent_at ?? "",
      l.followup_7d_sent_at ?? "",
      l.signed_up_at ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demo-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendFollowup = async (lead: Lead, kind: "24h" | "7d") => {
    const body = { lead_id: lead.id, email: lead.email };
    const fn = kind === "24h" ? "process-demo-followups" : "process-demo-followups";
    // Trigger processor; it will pick eligible leads. For an immediate manual nudge, we just call welcome again or run cron.
    await supabase.functions.invoke(fn, { body });
    toast({ title: "Triggered follow-up processor" });
    await load();
  };

  return (
    <>
      <SEO title="Demo Leads | Admin" description="Interactive demo leads dashboard" path="/admin/demo-leads" />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to Admin
            </Link>
            <h1 className="text-2xl font-bold mt-1">Interactive Demo Leads</h1>
            <p className="text-sm text-muted-foreground">Captured from /interactive-demo</p>
          </div>
          <Button onClick={exportCsv} variant="outline">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{leads.length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{leads.filter(l => l.demo_completed).length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Signed up</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{leads.filter(l => l.signed_up_at).length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">With feedback</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{leads.filter(l => l.feedback_text || l.feedback_score).length}</CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={completion} onValueChange={setCompletion}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="exited">Exited early</SelectItem>
              <SelectItem value="no_feedback">No feedback</SelectItem>
            </SelectContent>
          </Select>
          <Select value={signedUp} onValueChange={setSignedUp}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All signups</SelectItem>
              <SelectItem value="yes">Signed up</SelectItem>
              <SelectItem value="no">Not signed up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Started</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">NPS</th>
                  <th className="p-3">Feedback</th>
                  <th className="p-3">Emails</th>
                  <th className="p-3">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No leads match filters.</td></tr>}
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="p-3 font-medium">{l.email}</td>
                    <td className="p-3">{l.role ?? "—"}</td>
                    <td className="p-3 text-xs">{new Date(l.demo_started_at).toLocaleString()}</td>
                    <td className="p-3">
                      {l.demo_completed ? (
                        <Badge variant="default">Completed (step {(l.last_step_index ?? 0) + 1})</Badge>
                      ) : l.demo_exited_at ? (
                        <Badge variant="secondary">Exited @ step {(l.last_step_index ?? 0) + 1}</Badge>
                      ) : (
                        <Badge variant="outline">In progress</Badge>
                      )}
                    </td>
                    <td className="p-3">{l.feedback_score ?? "—"}</td>
                    <td className="p-3 max-w-xs">
                      {(l.feedback_reasons?.length || l.feedback_text) ? (
                        <div className="text-xs">
                          {l.feedback_reasons?.length ? <div className="text-muted-foreground">{l.feedback_reasons.join(", ")}</div> : null}
                          {l.feedback_text ? <div className="mt-1 italic">"{l.feedback_text}"</div> : null}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-xs space-y-0.5">
                      <div>W: {l.welcome_email_sent_at ? "✓" : "—"}</div>
                      <div>24h: {l.followup_24h_sent_at ? "✓" : "—"}</div>
                      <div>7d: {l.followup_7d_sent_at ? "✓" : "—"}</div>
                    </td>
                    <td className="p-3">
                      {l.signed_up_at ? <Badge>Signed up</Badge> : (
                        <Button size="sm" variant="ghost" onClick={() => sendFollowup(l, "24h")}>Run cron</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
