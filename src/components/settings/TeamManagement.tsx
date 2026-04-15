import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Shield, Trash2, Loader2, Plus, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL_PERMISSIONS = [
  { id: "manage_players", label: "Players" },
  { id: "manage_registration", label: "Registration" },
  { id: "manage_budget", label: "Budget" },
  { id: "manage_sponsors", label: "Sponsors" },
  { id: "manage_messages", label: "Messages" },
  { id: "manage_leaderboard", label: "Leaderboard" },
  { id: "manage_store", label: "Store" },
  { id: "manage_auction", label: "Auction" },
  { id: "manage_gallery", label: "Gallery" },
  { id: "manage_volunteers", label: "Volunteers" },
  { id: "manage_surveys", label: "Surveys" },
  { id: "manage_donations", label: "Donations" },
  { id: "manage_check_in", label: "Check-In" },
  { id: "manage_settings", label: "Settings" },
] as const;

const ROLES = [
  { value: "admin", label: "Admin", description: "Full access to everything" },
  { value: "editor", label: "Editor", description: "Can manage players, scores, sponsors" },
  { value: "viewer", label: "Viewer", description: "Can only view, no changes" },
] as const;

const ROLE_PRESETS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map((p) => p.id),
  editor: [
    "manage_players", "manage_registration", "manage_sponsors",
    "manage_leaderboard", "manage_store", "manage_auction",
    "manage_gallery", "manage_volunteers", "manage_surveys",
    "manage_donations", "manage_check_in",
  ],
  viewer: [],
};

interface TeamManagementProps {
  orgId: string;
  userId: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  permissions: string[];
  name?: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  created_at: string;
  name?: string | null;
}

export function TeamManagement({ orgId, userId }: TeamManagementProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(ROLE_PRESETS.editor);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [editRole, setEditRole] = useState("editor");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from("org_members")
        .select("id, user_id, role, permissions, name")
        .eq("organization_id", orgId),
      supabase
        .from("org_invitations")
        .select("id, email, role, permissions, status, created_at, name")
        .eq("organization_id", orgId)
        .eq("status", "pending"),
    ]);
    setMembers((membersRes.data as any) || []);
    setInvitations((invitesRes.data as any) || []);
    setLoading(false);
  };

  const togglePerm = (perm: string, perms: string[], setPerms: (p: string[]) => void) => {
    setPerms(perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]);
  };

  const handleRoleChange = (role: string) => {
    setInviteRole(role);
    setSelectedPerms(ROLE_PRESETS[role] || []);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!inviteName.trim()) {
      toast.error("Please enter the team member's name");
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("invite-member", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          organization_id: orgId,
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          role: inviteRole,
          permissions: selectedPerms,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation sent to ${inviteName.trim()}`);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("editor");
      setSelectedPerms(ROLE_PRESETS.editor);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from("org_invitations").delete().eq("id", inviteId);
    if (error) toast.error(error.message);
    else { toast.success("Invitation revoked"); fetchData(); }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === userId) { toast.error("You cannot remove yourself"); return; }
    const { error } = await supabase.from("org_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else { toast.success("Team member removed"); fetchData(); }
  };

  const openEditDialog = (member: MemberRow) => {
    setEditingMember(member);
    setEditRole(member.role);
    setEditPerms([...(member.permissions || [])]);
    setEditName(member.name || "");
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    setSaving(true);
    const { error } = await supabase
      .from("org_members")
      .update({ role: editRole, permissions: editPerms as any, name: editName.trim() || null })
      .eq("id", editingMember.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Member updated");
      setEditingMember(null);
      fetchData();
    }
    setSaving(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "owner") return "default";
    if (role === "admin") return "destructive";
    if (role === "editor") return "secondary";
    return "outline";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-lg border border-border p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-lg font-display font-bold text-foreground">Team Management</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Invite team members to help manage your tournaments. Assign roles and specific permissions to control what they can access.
      </p>

      {/* Current Members */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Current Members</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">
                      {m.user_id === userId ? "You" : m.name || "Team Member"}
                    </span>
                    {m.permissions && m.permissions.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {m.permissions.length} permissions
                      </span>
                    )}
                  </div>
                  <Badge variant={getRoleBadgeVariant(m.role)} className="text-[10px] capitalize shrink-0">
                    {m.role}
                  </Badge>
                </div>
                {m.role !== "owner" && m.user_id !== userId && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(m)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.id, m.user_id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
                {m.role === "owner" && (
                  <Badge variant="outline" className="text-[10px] shrink-0">Owner</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground block truncate">
                      {inv.name || inv.email}
                    </span>
                    {inv.name && (
                      <span className="text-[10px] text-muted-foreground block truncate">{inv.email}</span>
                    )}
                  </div>
                  <Badge variant={getRoleBadgeVariant(inv.role)} className="text-[10px] capitalize shrink-0">
                    {inv.role}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRevokeInvite(inv.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Invite New Member</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="invite-name" className="text-xs">Full Name</Label>
              <Input
                id="invite-name"
                placeholder="John Smith"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="invite-email" className="text-xs">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="team@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Role</Label>
            <RadioGroup value={inviteRole} onValueChange={handleRoleChange} className="space-y-2">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-3 p-2 rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <RadioGroupItem value={role.value} />
                  <div>
                    <span className="text-sm font-medium text-foreground">{role.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">– {role.description}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Permissions</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedPerms.includes(perm.id)}
                    onCheckedChange={() => togglePerm(perm.id, selectedPerms, setSelectedPerms)}
                  />
                  <span className="text-foreground">{perm.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setSelectedPerms(ALL_PERMISSIONS.map((p) => p.id))}>
                Select All
              </Button>
              <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setSelectedPerms([])}>
                Clear All
              </Button>
            </div>
          </div>

          <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim() || !inviteName.trim()}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Send Invitation
          </Button>
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Team member name"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs mb-2 block">Role</Label>
              <RadioGroup
                value={editRole}
                onValueChange={(r) => { setEditRole(r); setEditPerms(ROLE_PRESETS[r] || []); }}
                className="space-y-2"
              >
                {ROLES.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-3 p-2 rounded-md border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={role.value} />
                    <div>
                      <span className="text-sm font-medium text-foreground">{role.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">– {role.description}</span>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editPerms.includes(perm.id)}
                      onCheckedChange={() => togglePerm(perm.id, editPerms, setEditPerms)}
                    />
                    <span className="text-foreground">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
