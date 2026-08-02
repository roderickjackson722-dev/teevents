import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Users, Trophy, Flag, Search, ArrowLeft, Loader2, Download, StickyNote, Trash2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  adminListUserEvents, adminAddUserNote, adminDeleteUserNote,
  type CrmUser, type CrmEvent,
} from "@/lib/adminCrm.functions";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const statusClass = (s: string) => {
  const v = s.toLowerCase();
  if (v === "published" || v === "active") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (v === "draft") return "bg-slate-100 text-slate-700 border-slate-200";
  if (v === "past" || v === "completed") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

const normalizedStatus = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "published" || v === "active") return "active";
  if (v === "past" || v === "completed") return "completed";
  if (v === "draft") return "draft";
  return "pending";
};

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="text-left text-[11px] uppercase tracking-wide font-bold text-muted-foreground px-3 py-2">{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2 align-top text-sm ${className}`}>{children}</td>
);

export default function AdminUsersEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listUsers = useServerFn(adminListUserEvents);
  const addNote = useServerFn(adminAddUserNote);
  const deleteNote = useServerFn(adminDeleteUserNote);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<CrmUser | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin-user-events"],
    queryFn: () => listUsers({ data: {} } as any),
  });

  const saveNote = useMutation({
    mutationFn: (vars: { userId: string; note: string }) => addNote({ data: vars }),
    onSuccess: async () => {
      setNoteDraft("");
      toast.success("Note added");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-events"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not add note"),
  });

  const removeNote = useMutation({
    mutationFn: (vars: { noteId: string }) => deleteNote({ data: vars }),
    onSuccess: async () => {
      toast.success("Note deleted");
      await queryClient.invalidateQueries({ queryKey: ["admin-user-events"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not delete note"),
  });

  const rows: CrmUser[] = (data as any)?.rows ?? [];
  const totals = (data as any)?.totals ?? { users: 0, tournaments: 0, leagues: 0 };

  // keep the open modal in sync with refreshed data
  const selectedLive = selected ? rows.find((r) => r.user_id === selected.user_id) ?? selected : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((u) => {
      if (typeFilter === "tournaments" && u.tournament_count === 0) return false;
      if (typeFilter === "leagues" && u.league_count === 0) return false;
      if (typeFilter === "both" && (u.tournament_count === 0 || u.league_count === 0)) return false;

      if (statusFilter !== "all") {
        const hit = u.events.some((e) => normalizedStatus(e.status) === statusFilter);
        if (!hit) return false;
      }

      if (!q) return true;
      const hay = [
        u.email, u.full_name, u.organization_name,
        ...u.organizations, ...u.events.map((e) => e.name),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, typeFilter, statusFilter]);

  const statusCounts = useMemo(() => {
    const c = { active: 0, draft: 0, completed: 0, pending: 0 } as Record<string, number>;
    for (const u of rows) for (const e of u.events) c[normalizedStatus(e.status)] = (c[normalizedStatus(e.status)] ?? 0) + 1;
    return c;
  }, [rows]);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "Email", "Full Name", "Phone", "Organization", "Event Name", "Event Type",
      "Event Date", "Status", "Vetting Answers", "Admin Notes",
    ];
    const lines: string[] = [header.map(esc).join(",")];
    for (const u of filtered) {
      const vetting = u.vetting_answers
        ? Object.entries(u.vetting_answers).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" | ")
        : "";
      const notes = u.notes.map((n) => n.note).join(" | ");
      const events: Array<CrmEvent | null> = u.events.length ? u.events : [null];
      for (const e of events) {
        lines.push([
          u.email, u.full_name, u.phone, u.organization_name,
          e?.name ?? "", e?.type ?? "", e?.date ?? "", e?.status ?? "",
          vetting, notes,
        ].map(esc).join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teevents-users-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Admin
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5" /> Users &amp; Events
              </h1>
              <p className="text-xs text-muted-foreground">All users, their events, vetting answers and internal notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              {isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {([
            ["Total Users", totals.users],
            ["Tournaments", totals.tournaments],
            ["Leagues", totals.leagues],
            ["Active", statusCounts.active],
            ["Draft", statusCounts.draft],
            ["Completed", statusCounts.completed],
            ["Pending", statusCounts.pending],
          ] as const).map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">{label}</div>
                <div className="text-2xl font-bold">{value ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name, email or event…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              <SelectItem value="tournaments">Tournaments only</SelectItem>
              <SelectItem value="leagues">Leagues only</SelectItem>
              <SelectItem value="both">Both tournaments &amp; leagues</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{filtered.length} user{filtered.length === 1 ? "" : "s"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : isError ? (
              <div className="p-6 text-sm text-destructive">{(error as any)?.message || "Failed to load users"}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <Th>#</Th><Th>User</Th><Th>Events</Th><Th>Type</Th>
                      <Th>Date</Th><Th>Status</Th><Th>Notes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const primary = u.events[0];
                      const total = u.events.length;
                      return (
                        <tr
                          key={u.user_id}
                          className="border-b hover:bg-muted/40 cursor-pointer"
                          onClick={() => { setSelected(u); setNoteDraft(""); }}
                        >
                          <Td className="text-muted-foreground">{i + 1}</Td>
                          <Td>
                            <div className="font-medium">{u.email ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{u.full_name ?? "—"}</div>
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              {total} event{total === 1 ? "" : "s"}
                            </Badge>
                          </Td>
                          <Td>
                            {primary ? (
                              <div>
                                <div>{primary.name}</div>
                                {total > 1 && (
                                  <div className="text-xs text-muted-foreground">+{total - 1} more</div>
                                )}
                              </div>
                            ) : <span className="text-muted-foreground">No events</span>}
                          </Td>
                          <Td>
                            {primary ? (
                              <span className="inline-flex items-center gap-1 text-xs">
                                {primary.type === "tournament"
                                  ? <><Flag className="h-3.5 w-3.5" /> Tournament</>
                                  : <><Trophy className="h-3.5 w-3.5" /> League</>}
                              </span>
                            ) : "—"}
                          </Td>
                          <Td>{primary ? fmtDate(primary.date) : "—"}</Td>
                          <Td>
                            {primary ? (
                              <Badge variant="outline" className={`text-[10px] capitalize ${statusClass(primary.status)}`}>
                                {primary.status}
                              </Badge>
                            ) : "—"}
                          </Td>
                          <Td>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <StickyNote className="h-3.5 w-3.5" /> {u.notes.length}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                    {!filtered.length && (
                      <tr><Td className="text-muted-foreground p-6">No users match your filters.</Td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail modal */}
      <Dialog open={!!selectedLive} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedLive && (
            <>
              <DialogHeader>
                <DialogTitle>User Details — {selectedLive.full_name || selectedLive.email}</DialogTitle>
                <DialogDescription>{selectedLive.email}</DialogDescription>
              </DialogHeader>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">User Information</CardTitle></CardHeader>
                <CardContent className="text-sm grid sm:grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Full Name:</span> {selectedLive.full_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {selectedLive.email ?? "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedLive.phone ?? "—"}</div>
                  <div><span className="text-muted-foreground">Organization:</span> {selectedLive.organization_name ?? "—"}</div>
                  <div><span className="text-muted-foreground">Joined:</span> {fmtDate(selectedLive.created_at)}</div>
                  <div><span className="text-muted-foreground">Last sign in:</span> {fmtDate(selectedLive.last_sign_in_at)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Vetting Answers</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {selectedLive.vetting_answers
                    ? Object.entries(selectedLive.vetting_answers)
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                        ))
                    : <div className="text-muted-foreground">No vetting answers on file.</div>}
                  {selectedLive.vetting_answers &&
                    !Object.values(selectedLive.vetting_answers).some(Boolean) && (
                      <div className="text-muted-foreground">No vetting answers on file.</div>
                    )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Events ({selectedLive.events.length})</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {selectedLive.events.length ? selectedLive.events.map((e, i) => (
                    <div key={`${e.type}-${e.id}`} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-muted-foreground capitalize">— {e.type} —</span>
                      <span>{fmtDate(e.date)}</span>
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusClass(e.status)}`}>{e.status}</Badge>
                    </div>
                  )) : <div className="text-muted-foreground">No events yet.</div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Admin Notes (internal only)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {selectedLive.notes.length ? selectedLive.notes.map((n) => (
                      <div key={n.id} className="rounded-md border p-2 text-sm flex items-start justify-between gap-2">
                        <div>
                          <div className="whitespace-pre-wrap">{n.note}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {n.created_by_email ?? "admin"} · {fmtDate(n.created_at)}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => removeNote.mutate({ noteId: n.id })}
                          disabled={removeNote.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )) : <div className="text-sm text-muted-foreground">No notes yet.</div>}
                  </div>
                  <Textarea
                    placeholder="Add an internal note about this user…"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={!noteDraft.trim() || saveNote.isPending}
                    onClick={() => saveNote.mutate({ userId: selectedLive.user_id, note: noteDraft })}
                  >
                    {saveNote.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <StickyNote className="h-4 w-4 mr-1" />}
                    Add Note
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
