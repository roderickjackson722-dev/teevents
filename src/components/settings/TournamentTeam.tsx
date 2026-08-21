import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listTournamentTeam,
  inviteTournamentTeamMember,
  updateTournamentTeamRole,
  removeTournamentTeamMember,
  resendTournamentInvitation,
} from "@/lib/tournamentTeam.functions";
import { getUserTournaments } from "@/lib/tournamentTeam.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Trash2, UserPlus, RefreshCw } from "lucide-react";

const ROLES: { value: string; label: string; hint: string }[] = [
  { value: "organizer", label: "Organizer", hint: "Full control, including team management" },
  { value: "admin", label: "Admin", hint: "Manage everything except billing/ownership" },
  { value: "editor", label: "Editor", hint: "Edit players, pairings, scores and content" },
  { value: "viewer", label: "Viewer", hint: "Read-only access to the dashboard" },
  { value: "scoring_only", label: "Scoring Only", hint: "Enter and edit scores only" },
];

const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label || role;

interface TeamRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  status: string;
}

export function TournamentTeam({ initialTournamentId }: { initialTournamentId?: string }) {
  const { toast } = useToast();
  const loadTournaments = useServerFn(getUserTournaments);
  const loadTeam = useServerFn(listTournamentTeam);
  const invite = useServerFn(inviteTournamentTeamMember);
  const updateRole = useServerFn(updateTournamentTeamRole);
  const removeMember = useServerFn(removeTournamentTeamMember);
  const resend = useServerFn(resendTournamentInvitation);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [tournamentId, setTournamentId] = useState(initialTournamentId || "");
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState<TeamRow[]>([]);
  const [invitations, setInvitations] = useState<TeamRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "editor" });

  useEffect(() => {
    (async () => {
      try {
        const res: any = await loadTournaments({ data: {} } as any);
        const list = res?.tournaments || [];
        setTournaments(list);
        setTournamentId((prev) => prev || list[0]?.id || "");
      } catch {
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTeam = async (id: string) => {
    if (!id) return;
    try {
      const res: any = await loadTeam({ data: { tournamentId: id } });
      setCanManage(!!res?.canManage);
      setMembers(res?.members || []);
      setInvitations(res?.invitations || []);
    } catch (err: any) {
      toast({ title: "Couldn't load the team", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (tournamentId) refreshTeam(tournamentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const selected = useMemo(
    () => tournaments.find((t) => t.id === tournamentId),
    [tournaments, tournamentId],
  );

  const handleInvite = async () => {
    if (!tournamentId) return;
    setSaving(true);
    try {
      const res: any = await invite({
        data: { tournamentId, email: form.email, name: form.name, role: form.role },
      });
      toast({
        title: res?.existingUser ? "Access granted" : "Invitation sent",
        description: res?.existingUser
          ? `${form.email} now has ${roleLabel(form.role)} access to this tournament.`
          : res?.emailSent
            ? `We emailed ${form.email} an invitation link.`
            : `Invitation created, but the email could not be sent${res?.emailError ? `: ${res.emailError}` : "."}`,
      });
      setDialogOpen(false);
      setForm({ email: "", name: "", role: "editor" });
      refreshTeam(tournamentId);
    } catch (err: any) {
      toast({ title: "Invitation failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (kind: "member" | "invitation", row: TeamRow, role: string) => {
    try {
      await updateRole({ data: { tournamentId, kind, id: row.id, role, name: row.name || "" } });
      refreshTeam(tournamentId);
    } catch (err: any) {
      toast({ title: "Couldn't update role", description: err.message, variant: "destructive" });
    }
  };

  const handleRemove = async (kind: "member" | "invitation", row: TeamRow) => {
    try {
      await removeMember({ data: { tournamentId, kind, id: row.id } });
      toast({ title: kind === "invitation" ? "Invitation cancelled" : "Team member removed" });
      refreshTeam(tournamentId);
    } catch (err: any) {
      toast({ title: "Couldn't remove", description: err.message, variant: "destructive" });
    }
  };

  const handleResend = async (row: TeamRow) => {
    try {
      const res: any = await resend({ data: { tournamentId, invitationId: row.id } });
      toast({
        title: res?.emailSent ? "Invitation resent" : "Could not send email",
        description: res?.emailSent ? `A fresh link was emailed to ${row.email}.` : res?.emailError,
        variant: res?.emailSent ? undefined : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Couldn't resend", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Tournament Team</CardTitle>
            <CardDescription>
              Give people access to one specific tournament. They keep their own account and can still
              run their own tournaments as an organizer.
            </CardDescription>
          </div>
          {canManage && tournamentId && (
            <Button onClick={() => setDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite to this tournament
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-md space-y-2">
          <Label>Tournament</Label>
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tournament" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected?.access === "team_member" && (
            <p className="text-xs text-muted-foreground">
              You have {roleLabel(selected.role)} access to this tournament.
            </p>
          )}
        </div>

        {!tournamentId ? (
          <p className="text-sm text-muted-foreground">Create a tournament to start adding team members.</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Members</h3>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members yet.</p>
              ) : (
                <div className="divide-y rounded-md border">
                  {members.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name || m.email || "Team member"}</p>
                        {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                      </div>
                      <Badge variant="secondary">{m.status}</Badge>
                      {canManage ? (
                        <Select value={m.role} onValueChange={(v) => handleRoleChange("member", m, v)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge>{roleLabel(m.role)}</Badge>
                      )}
                      {canManage && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemove("member", m)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {invitations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Pending invitations</h3>
                <div className="divide-y rounded-md border">
                  {invitations.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-3 p-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.email}</p>
                        {i.name && <p className="truncate text-xs text-muted-foreground">{i.name}</p>}
                      </div>
                      <Badge variant="outline">Pending</Badge>
                      <Badge>{roleLabel(i.role)}</Badge>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleResend(i)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemove("invitation", i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They'll get access to {selected?.title || "this tournament"} only. If they already have a
              TeeVents account, access is granted immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-email">Email</Label>
              <Input
                id="team-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-name">Name (optional)</Label>
              <Input
                id="team-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label} — {r.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={saving || !form.email}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default TournamentTeam;
