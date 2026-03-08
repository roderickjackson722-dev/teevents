import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Shield, Trash2, Loader2, Plus, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";

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

interface TeamManagementProps {
  orgId: string;
  userId: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  permissions: string[];
  email?: string;
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  created_at: string;
}

export function TeamManagement({ orgId, userId }: TeamManagementProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(ALL_PERMISSIONS.map((p) => p.id));
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from("org_members")
        .select("id, user_id, role, permissions")
        .eq("organization_id", orgId),
      supabase
        .from("org_invitations")
        .select("id, email, role, permissions, status, created_at")
        .eq("organization_id", orgId)
        .eq("status", "pending"),
    ]);
    setMembers((membersRes.data as any) || []);
    setInvitations((invitesRes.data as any) || []);
    setLoading(false);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      toast.error("Please enter a valid email address");
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
          permissions: selectedPerms,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setSelectedPerms(ALL_PERMISSIONS.map((p) => p.id));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from("org_invitations")
      .delete()
      .eq("id", inviteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitation revoked");
      fetchData();
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === userId) {
      toast.error("You cannot remove yourself");
      return;
    }
    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("Team member removed");
      fetchData();
    }
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
        Invite team members to help manage your tournaments. Assign specific permissions to control what they can access.
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
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {m.user_id === userId ? "You" : `Member`}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {m.role}
                    </Badge>
                  </div>
                </div>
                {m.role === "owner" ? (
                  <Badge variant="outline" className="text-[10px]">Owner</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(m.id, m.user_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
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
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{inv.email}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {inv.permissions.length} permissions
                    </span>
                  </div>
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

          <div>
            <Label className="text-xs mb-2 block">Permissions</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPerms.includes(perm.id)}
                    onCheckedChange={() => togglePerm(perm.id)}
                  />
                  <span className="text-foreground">{perm.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto"
                onClick={() => setSelectedPerms(ALL_PERMISSIONS.map((p) => p.id))}
              >
                Select All
              </Button>
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto"
                onClick={() => setSelectedPerms([])}
              >
                Clear All
              </Button>
            </div>
          </div>

          <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
