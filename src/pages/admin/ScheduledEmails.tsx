import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarClock, Loader2, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatInTimezone } from "@/lib/timezones";
import {
  adminListScheduledEmails,
  adminRetryScheduledEmail,
  type AdminScheduledEmail,
} from "@/lib/adminScheduledEmails.functions";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  sending: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  sent: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  canceled: "bg-muted text-muted-foreground hover:bg-muted",
};

const AdminScheduledEmails = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<AdminScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminListScheduledEmails({ data: {} } as any);
      setJobs(rows);
    } catch (e: any) {
      toast.error(e?.message || "Could not load scheduled emails");
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/admin-login"); return; }
      const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (!adminCheck) { toast.error("Admin access required"); navigate("/"); return; }
      setIsAdmin(true);
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await adminRetryScheduledEmail({ data: { id } });
      toast.success("Requeued — it goes out on the next processing run");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not requeue that job");
    }
    setRetrying(null);
  };

  if (isAdmin === null) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? jobs.filter((j) =>
        `${j.tournament_title || ""} ${j.template_kind} ${j.status} ${j.created_by_email || ""} ${j.note || ""}`
          .toLowerCase()
          .includes(q),
      )
    : jobs;

  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/admin")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Admin Dashboard
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-6 w-6 text-secondary" />
            <h1 className="text-2xl font-display font-bold">Scheduled Emails</h1>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Every scheduled template email across all events — when it goes out, its time zone, current status, and who
          set it up. Failed sends can be requeued from here.
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {["scheduled", "sending", "sent", "failed", "canceled"].map((s) => (
            <Badge key={s} className={`text-xs ${STATUS_STYLES[s] || ""}`} variant={s === "failed" ? "destructive" : "default"}>
              {s}: {counts[s] || 0}
            </Badge>
          ))}
        </div>

        <Card className="p-4 mb-4">
          <Input
            placeholder="Search by event, template, status, or creator email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading scheduled emails…</div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">No scheduled emails found.</Card>
        ) : (
          <Card className="divide-y">
            {filtered.map((j) => (
              <div key={j.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">
                    {j.tournament_title || "Unknown event"}
                    <span className="text-muted-foreground font-normal"> · {j.template_kind.replace(/_/g, " ")}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatInTimezone(j.scheduled_for, j.timezone)}
                    {j.recipient_count != null ? ` · ${j.recipient_count} recipient(s)` : ""}
                    {j.status === "sent" ? ` · sent ${j.sent_count ?? 0}${j.failed_count ? `, ${j.failed_count} failed` : ""}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created by {j.created_by_email || "unknown user"} on {new Date(j.created_at).toLocaleString()}
                    {j.note ? ` · ${j.note}` : ""}
                  </p>
                  {j.error && (
                    <p className="text-xs text-destructive flex items-start gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">Failed: {j.error}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${STATUS_STYLES[j.status] || ""}`} variant={j.status === "failed" ? "destructive" : "default"}>
                    {j.status}
                  </Badge>
                  {(j.status === "failed" || j.status === "canceled" || (j.status === "sent" && (j.failed_count ?? 0) > 0)) && (
                    <Button size="sm" variant="outline" className="gap-1" disabled={retrying === j.id} onClick={() => retry(j.id)}>
                      {retrying === j.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminScheduledEmails;
