import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, Activity, Users, Trophy, Ban, Globe, Loader2,
  RefreshCw, Search, ArrowLeft, Mail, LogOut, CheckCircle2, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListActivity, adminListFlags, adminResolveFlag, adminListSessions,
  adminEndSession, adminListSecurityTournaments, adminSetTournamentState,
  adminListSuspensions, adminSuspendUser, adminUnsuspendUser,
  adminListBlacklist, adminAddBlacklistIp, adminRemoveBlacklistIp,
  adminGetAlertSettings, adminSaveAlertSettings, adminSendTestAlert,
} from "@/lib/security.functions";

type TabKey = "activity" | "sessions" | "tournaments" | "flags" | "suspensions" | "blacklist" | "alerts";

const TABS: Array<[TabKey, string, typeof Shield]> = [
  ["activity", "Activity Log", Activity],
  ["sessions", "Active Sessions", Users],
  ["tournaments", "Tournaments", Trophy],
  ["flags", "Suspicious Activity", AlertTriangle],
  ["suspensions", "Suspensions", Ban],
  ["blacklist", "IP Blacklist", Globe],
  ["alerts", "Alert Settings", Mail],
];

const ACTION_TYPES = [
  "all", "login", "login_failed", "logout", "signup", "registration",
  "tournament_create", "payment", "payout", "password_reset", "score_edit", "admin_action",
];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

const sevBadge = (sev: string) => {
  const s = (sev || "").toLowerCase();
  if (s === "critical" || s === "high") return "bg-red-100 text-red-800 border-red-200";
  if (s === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-left text-[11px] uppercase tracking-wide font-bold text-muted-foreground px-3 py-2">{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 text-sm align-top ${className}`}>{children}</td>
);

const Panel = ({ title, subtitle, right, children }: {
  title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="bg-card border border-border rounded-lg">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
      <div>
        <h2 className="font-display font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const Empty = ({ label }: { label: string }) => (
  <div className="p-8 text-center text-sm text-muted-foreground">{label}</div>
);

const AdminSecurity = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("activity");

  // server fns
  const listActivity = useServerFn(adminListActivity);
  const listFlags = useServerFn(adminListFlags);
  const resolveFlag = useServerFn(adminResolveFlag);
  const listSessions = useServerFn(adminListSessions);
  const endSession = useServerFn(adminEndSession);
  const listTournaments = useServerFn(adminListSecurityTournaments);
  const setTournamentState = useServerFn(adminSetTournamentState);
  const listSuspensions = useServerFn(adminListSuspensions);
  const suspendUser = useServerFn(adminSuspendUser);
  const unsuspendUser = useServerFn(adminUnsuspendUser);
  const listBlacklist = useServerFn(adminListBlacklist);
  const addIp = useServerFn(adminAddBlacklistIp);
  const removeIp = useServerFn(adminRemoveBlacklistIp);
  const getSettings = useServerFn(adminGetAlertSettings);
  const saveSettings = useServerFn(adminSaveAlertSettings);
  const sendTest = useServerFn(adminSendTestAlert);

  // activity filters
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const activityQ = useQuery({
    queryKey: ["sec-activity", search, actionType, from, to],
    queryFn: () => listActivity({
      data: {
        search: search || undefined,
        actionType,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      },
    }),
    enabled: tab === "activity",
  });

  const flagsQ = useQuery({ queryKey: ["sec-flags"], queryFn: () => listFlags({}), enabled: tab === "flags" });
  const sessionsQ = useQuery({ queryKey: ["sec-sessions"], queryFn: () => listSessions({}), enabled: tab === "sessions" });
  const tournamentsQ = useQuery({ queryKey: ["sec-tournaments"], queryFn: () => listTournaments({}), enabled: tab === "tournaments" });
  const suspensionsQ = useQuery({ queryKey: ["sec-suspensions"], queryFn: () => listSuspensions({}), enabled: tab === "suspensions" });
  const blacklistQ = useQuery({ queryKey: ["sec-blacklist"], queryFn: () => listBlacklist({}), enabled: tab === "blacklist" });
  const settingsQ = useQuery({ queryKey: ["sec-settings"], queryFn: () => getSettings({}), enabled: tab === "alerts" });

  const invalidate = (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // ----- suspension modal -----
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendEmail, setSuspendEmail] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendPermanent, setSuspendPermanent] = useState(false);
  const [suspendNotify, setSuspendNotify] = useState(true);

  const suspendMut = useMutation({
    mutationFn: () => suspendUser({
      data: {
        email: suspendEmail.trim(),
        reason: suspendReason.trim(),
        permanent: suspendPermanent,
        notify: suspendNotify,
      },
    }),
    onSuccess: (r: any) => {
      toast.success(r?.emailed ? "User suspended and notified" : "User suspended");
      setSuspendOpen(false);
      setSuspendEmail(""); setSuspendReason("");
      invalidate(["sec-suspensions", "sec-sessions"]);
    },
    onError: (e: any) => toast.error(e?.message || "Could not suspend user"),
  });

  const openSuspend = (email: string) => {
    setSuspendEmail(email); setSuspendReason(""); setSuspendPermanent(false);
    setSuspendNotify(true); setSuspendOpen(true);
  };

  // ----- blacklist form -----
  const [newIp, setNewIp] = useState("");
  const [newIpReason, setNewIpReason] = useState("");
  const addIpMut = useMutation({
    mutationFn: () => addIp({ data: { ip: newIp.trim(), reason: newIpReason.trim() } }),
    onSuccess: () => { toast.success("IP blocked"); setNewIp(""); setNewIpReason(""); invalidate(["sec-blacklist"]); },
    onError: (e: any) => toast.error(e?.message || "Could not block IP"),
  });

  // ----- alert settings local state -----
  const settings = settingsQ.data?.settings as any;
  const [draft, setDraft] = useState<any>(null);
  const current = draft ?? settings;
  useMemo(() => { if (settings && !draft) setDraft({ ...settings }); return null; }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => saveSettings({
      data: {
        id: current.id,
        enabled: !!current.enabled,
        recipients: current.recipients || "",
        alert_high: !!current.alert_high,
        alert_medium: !!current.alert_medium,
        alert_low: !!current.alert_low,
      },
    }),
    onSuccess: () => { toast.success("Alert settings saved"); invalidate(["sec-settings"]); },
    onError: (e: any) => toast.error(e?.message || "Could not save settings"),
  });

  const flags = (flagsQ.data?.rows ?? []) as any[];
  const openFlags = flags.filter((f) => !f.is_resolved);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Security &amp; Monitoring</h1>
              <p className="text-sm text-muted-foreground">
                Platform activity, sessions, and abuse controls
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => invalidate(["sec-activity", "sec-flags", "sec-sessions", "sec-tournaments", "sec-suspensions", "sec-blacklist", "sec-settings"])}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-card border border-b-0 border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
              {key === "flags" && openFlags.length > 0 && (
                <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-800 rounded-full px-1.5 py-0.5">
                  {openFlags.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---------------- Activity Log ---------------- */}
        {tab === "activity" && (
          <Panel
            title="Activity Log"
            subtitle="Logins, signups, registrations, tournament creation, payments and admin actions"
            right={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-56"
                    placeholder="Email, IP, or city"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            }
          >
            {activityQ.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (activityQ.data?.rows ?? []).length === 0 ? (
              <Empty label="No activity recorded for this filter." />
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr><Th>When</Th><Th>User</Th><Th>Action</Th><Th>IP</Th><Th>Location</Th><Th>Details</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(activityQ.data!.rows as any[]).map((r) => (
                    <tr key={r.id}>
                      <Td className="whitespace-nowrap">{fmt(r.created_at)}</Td>
                      <Td>{r.user_email || "—"}</Td>
                      <Td><Badge variant="outline">{String(r.action_type).replace(/_/g, " ")}</Badge></Td>
                      <Td className="font-mono text-xs">{r.ip_address || "—"}</Td>
                      <Td>{[r.location_city, r.location_country].filter(Boolean).join(", ") || "—"}</Td>
                      <Td className="max-w-[280px] text-xs text-muted-foreground break-words">
                        {r.action_details && Object.keys(r.action_details).length > 0
                          ? JSON.stringify(r.action_details)
                          : "—"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* ---------------- Sessions ---------------- */}
        {tab === "sessions" && (
          <Panel
            title="Active Sessions"
            subtitle="Accounts with a sign-in in the last 24 hours"
            right={
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm("End every user session except your own?")) return;
                  const r: any = await endSession({ data: { all: true } });
                  toast.success(`Ended ${r.ended} of ${r.attempted} sessions`);
                  invalidate(["sec-sessions"]);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> End All Sessions
              </Button>
            }
          >
            {sessionsQ.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (sessionsQ.data?.rows ?? []).length === 0 ? (
              <Empty label="No sessions in the last 24 hours." />
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr><Th>User</Th><Th>Started</Th><Th>IP</Th><Th>Location</Th><Th>Device</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(sessionsQ.data!.rows as any[]).map((s) => (
                    <tr key={s.user_id}>
                      <Td>{s.email}</Td>
                      <Td className="whitespace-nowrap">{fmt(s.started_at)}</Td>
                      <Td className="font-mono text-xs">{s.ip_address || "—"}</Td>
                      <Td>{s.location || "—"}</Td>
                      <Td>{s.device}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            const r: any = await endSession({ data: { userId: s.user_id } });
                            r.ended ? toast.success("Session ended") : toast.error("Could not end session");
                            invalidate(["sec-sessions"]);
                          }}>End</Button>
                          <Button size="sm" variant="destructive" onClick={() => openSuspend(s.email)}>Suspend</Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* ---------------- Tournaments ---------------- */}
        {tab === "tournaments" && (
          <Panel title="Tournaments" subtitle="Every tournament with organizer, creation origin and registration volume">
            {tournamentsQ.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (tournamentsQ.data?.rows ?? []).length === 0 ? (
              <Empty label="No tournaments found." />
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr><Th>Tournament</Th><Th>Organizer</Th><Th>Created</Th><Th>IP / Location</Th><Th>Regs</Th><Th>Status</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(tournamentsQ.data!.rows as any[]).map((t) => (
                    <tr key={t.id}>
                      <Td>
                        <div className="font-medium">{t.title}</div>
                        <div className="text-xs text-muted-foreground">{t.organization_name || "—"}</div>
                      </Td>
                      <Td>{t.organizer_email || "—"}</Td>
                      <Td className="whitespace-nowrap">{fmt(t.created_at)}</Td>
                      <Td className="text-xs">
                        <div className="font-mono">{t.ip_address || "—"}</div>
                        <div className="text-muted-foreground">{t.location || ""}</div>
                      </Td>
                      <Td>{t.registrations}</Td>
                      <Td>
                        <Badge variant="outline">{t.status}</Badge>
                        {t.site_published && <div className="text-[10px] text-muted-foreground mt-1">published</div>}
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            if (!confirm(`Unpublish and suspend "${t.title}"?`)) return;
                            await setTournamentState({ data: { tournamentId: t.id, mode: "suspend" } });
                            toast.success("Tournament suspended");
                            invalidate(["sec-tournaments"]);
                          }}>Suspend</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm(`Archive "${t.title}"?`)) return;
                            await setTournamentState({ data: { tournamentId: t.id, mode: "archive" } });
                            toast.success("Tournament archived");
                            invalidate(["sec-tournaments"]);
                          }}>Archive</Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* ---------------- Flags ---------------- */}
        {tab === "flags" && (
          <Panel title="Suspicious Activity" subtitle="Automated detections: failed login bursts, new-location logins, rapid tournament creation, spam signups">
            {flagsQ.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : flags.length === 0 ? (
              <Empty label="No suspicious activity detected." />
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr><Th>When</Th><Th>Severity</Th><Th>Type</Th><Th>User</Th><Th>Description</Th><Th>IP / Location</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {flags.map((f) => (
                    <tr key={f.id} className={f.is_resolved ? "opacity-60" : ""}>
                      <Td className="whitespace-nowrap">{fmt(f.created_at)}</Td>
                      <Td><span className={`text-xs font-bold px-2 py-0.5 rounded border ${sevBadge(f.severity)}`}>{String(f.severity).toUpperCase()}</span></Td>
                      <Td className="text-xs">{String(f.flag_type).replace(/_/g, " ")}</Td>
                      <Td>{f.user_email || "—"}</Td>
                      <Td className="max-w-[300px]">{f.description}</Td>
                      <Td className="text-xs">
                        <div className="font-mono">{f.ip_address || "—"}</div>
                        <div className="text-muted-foreground">{[f.location_city, f.location_country].filter(Boolean).join(", ")}</div>
                      </Td>
                      <Td>
                        {f.is_resolved ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => {
                              await resolveFlag({ data: { id: f.id } });
                              toast.success("Flag resolved");
                              invalidate(["sec-flags"]);
                            }}>Resolve</Button>
                            {f.user_email && (
                              <Button size="sm" variant="destructive" onClick={() => openSuspend(f.user_email)}>Suspend</Button>
                            )}
                            {f.ip_address && (
                              <Button size="sm" variant="ghost" onClick={() => { setTab("blacklist"); setNewIp(f.ip_address); setNewIpReason(f.description || ""); }}>
                                Block IP
                              </Button>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* ---------------- Suspensions ---------------- */}
        {tab === "suspensions" && (
          <Panel
            title="Suspensions"
            subtitle="Suspended accounts cannot sign in until reinstated"
            right={<Button onClick={() => openSuspend("")}><Ban className="h-4 w-4 mr-2" /> Suspend a user</Button>}
          >
            {suspensionsQ.isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (suspensionsQ.data?.rows ?? []).length === 0 ? (
              <Empty label="No suspensions on record." />
            ) : (
              <table className="w-full">
                <thead className="bg-muted/40 border-b border-border">
                  <tr><Th>User</Th><Th>Suspended</Th><Th>Expires</Th><Th>Reason</Th><Th>Status</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(suspensionsQ.data!.rows as any[]).map((s) => (
                    <tr key={s.id}>
                      <Td>{s.user_email}</Td>
                      <Td className="whitespace-nowrap">{fmt(s.suspended_at)}</Td>
                      <Td className="whitespace-nowrap">{s.expires_at ? fmt(s.expires_at) : "Permanent"}</Td>
                      <Td className="max-w-[280px]">{s.reason || "—"}</Td>
                      <Td>
                        <Badge variant={s.is_active ? "destructive" : "outline"}>
                          {s.is_active ? "Active" : "Lifted"}
                        </Badge>
                      </Td>
                      <Td>
                        {s.is_active && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            await unsuspendUser({ data: { id: s.id } });
                            toast.success("Suspension lifted");
                            invalidate(["sec-suspensions"]);
                          }}>Reinstate</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {/* ---------------- Blacklist ---------------- */}
        {tab === "blacklist" && (
          <div className="space-y-6">
            <Panel title="Block an IP address" subtitle="Blocked networks are refused at login, signup and registration">
              <div className="p-4 flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>IP address</Label>
                  <Input className="w-56 font-mono" placeholder="203.0.113.42" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
                </div>
                <div className="space-y-1 flex-1 min-w-[220px]">
                  <Label>Reason</Label>
                  <Input placeholder="Why is this network blocked?" value={newIpReason} onChange={(e) => setNewIpReason(e.target.value)} />
                </div>
                <Button disabled={!newIp.trim() || addIpMut.isPending} onClick={() => addIpMut.mutate()}>
                  {addIpMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Block IP"}
                </Button>
              </div>
            </Panel>

            <Panel title="Blocked IP addresses">
              {blacklistQ.isLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (blacklistQ.data?.rows ?? []).length === 0 ? (
                <Empty label="No IP addresses are blocked." />
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr><Th>IP</Th><Th>Reason</Th><Th>Added by</Th><Th>Added</Th><Th /></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(blacklistQ.data!.rows as any[]).map((b) => (
                      <tr key={b.id}>
                        <Td className="font-mono text-xs">{b.ip_address}</Td>
                        <Td className="max-w-[320px]">{b.reason || "—"}</Td>
                        <Td>{b.added_by_email || "—"}</Td>
                        <Td className="whitespace-nowrap">{fmt(b.created_at)}</Td>
                        <Td>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            await removeIp({ data: { id: b.id } });
                            toast.success("IP unblocked");
                            invalidate(["sec-blacklist"]);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}

        {/* ---------------- Alert settings ---------------- */}
        {tab === "alerts" && (
          <div className="space-y-6">
            <Panel title="Email Alerts" subtitle="Automatic emails when suspicious activity is detected">
              {settingsQ.isLoading || !current ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="p-4 space-y-5 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable security alert emails</Label>
                      <p className="text-xs text-muted-foreground">Turn off to stop all alert emails</p>
                    </div>
                    <Switch checked={!!current.enabled} onCheckedChange={(v) => setDraft({ ...current, enabled: v })} />
                  </div>

                  <div className="space-y-1">
                    <Label>Recipients (comma separated)</Label>
                    <Textarea
                      value={current.recipients || ""}
                      onChange={(e) => setDraft({ ...current, recipients: e.target.value })}
                      placeholder="info@teevents.golf"
                      rows={2}
                    />
                  </div>

                  <div className="grid gap-3">
                    {([
                      ["alert_high", "High / critical severity", "Failed login bursts, blocked IP attempts"],
                      ["alert_medium", "Medium severity", "New-location logins, rapid tournament creation"],
                      ["alert_low", "Low severity", "Spam-pattern registrations"],
                    ] as const).map(([key, label, hint]) => (
                      <div key={key} className="flex items-center justify-between border border-border rounded-md p-3">
                        <div>
                          <Label>{label}</Label>
                          <p className="text-xs text-muted-foreground">{hint}</p>
                        </div>
                        <Switch checked={!!current[key]} onCheckedChange={(v) => setDraft({ ...current, [key]: v })} />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                      {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      await sendTest({ data: { severity: "high" } });
                      toast.success("Test alert triggered");
                      invalidate(["sec-settings", "sec-flags"]);
                    }}>
                      Send test alert
                    </Button>
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Recent alert emails">
              {(settingsQ.data?.log ?? []).length === 0 ? (
                <Empty label="No alert emails sent yet." />
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr><Th>When</Th><Th>Subject</Th><Th>Severity</Th><Th>Recipients</Th><Th>Result</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(settingsQ.data!.log as any[]).map((l) => (
                      <tr key={l.id}>
                        <Td className="whitespace-nowrap">{fmt(l.created_at)}</Td>
                        <Td>{l.subject}</Td>
                        <Td><span className={`text-xs font-bold px-2 py-0.5 rounded border ${sevBadge(l.severity)}`}>{String(l.severity).toUpperCase()}</span></Td>
                        <Td className="text-xs">{l.recipients}</Td>
                        <Td className="text-xs">{l.sent ? "Sent" : (l.error_message || "Failed")}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        )}
      </div>

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend user</DialogTitle>
            <DialogDescription>
              The account is blocked from signing in. Temporary suspensions last 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>User email</Label>
              <Input value={suspendEmail} onChange={(e) => setSuspendEmail(e.target.value)} placeholder="organizer@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
                placeholder="Suspicious payment activity" />
            </div>
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <Label>Permanent suspension</Label>
              <Switch checked={suspendPermanent} onCheckedChange={setSuspendPermanent} />
            </div>
            <div className="flex items-center justify-between border border-border rounded-md p-3">
              <Label>Email the user</Label>
              <Switch checked={suspendNotify} onCheckedChange={setSuspendNotify} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!suspendEmail.trim() || suspendMut.isPending} onClick={() => suspendMut.mutate()}>
              {suspendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSecurity;
