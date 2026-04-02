import { useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus, Trash2, UserCheck, UserPlus, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Volunteers() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", max_volunteers: "4", time_slot: "" });
  const [assignForm, setAssignForm] = useState({ name: "", email: "", phone: "" });

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments", org?.orgId],
    queryFn: async () => {
      const { data } = await supabase.from("tournaments").select("id, title").eq("organization_id", org!.orgId).order("date", { ascending: false });
      return data || [];
    },
    enabled: !!org,
  });

  const { data: roles } = useQuery({
    queryKey: ["volunteer-roles", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_volunteer_roles").select("*").eq("tournament_id", selectedTournament).order("sort_order");
      return data || [];
    },
    enabled: !!selectedTournament,
  });

  const { data: volunteers } = useQuery({
    queryKey: ["volunteers", selectedTournament],
    queryFn: async () => {
      const { data } = await supabase.from("tournament_volunteers").select("*").eq("tournament_id", selectedTournament);
      return data || [];
    },
    enabled: !!selectedTournament,
  });

  const addRoleMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_volunteer_roles").insert({
        tournament_id: selectedTournament,
        title: form.title,
        description: form.description || null,
        max_volunteers: parseInt(form.max_volunteers) || 4,
        time_slot: form.time_slot || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role added!" });
      setDialogOpen(false);
      setForm({ title: "", description: "", max_volunteers: "4", time_slot: "" });
      queryClient.invalidateQueries({ queryKey: ["volunteer-roles"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_volunteer_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-roles"] });
      toast({ title: "Role removed" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (demoGuard()) throw new Error("Demo mode");
      if (!assignRoleId) throw new Error("No role selected");
      const { error } = await supabase.from("tournament_volunteers").insert({
        tournament_id: selectedTournament,
        role_id: assignRoleId,
        name: assignForm.name,
        email: assignForm.email,
        phone: assignForm.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Volunteer assigned!" });
      setAssignDialogOpen(false);
      setAssignForm({ name: "", email: "", phone: "" });
      setAssignRoleId(null);
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeVolunteerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_volunteers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      toast({ title: "Volunteer removed" });
    },
  });

  const toggleCheckIn = useMutation({
    mutationFn: async ({ id, checked_in }: { id: string; checked_in: boolean }) => {
      if (demoGuard()) throw new Error("Demo mode");
      const { error } = await supabase.from("tournament_volunteers").update({
        checked_in,
        checked_in_at: checked_in ? new Date().toISOString() : null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
    },
  });

  const getVolunteersForRole = (roleId: string) => volunteers?.filter((v) => v.role_id === roleId) || [];

  const totalVolunteers = volunteers?.length || 0;
  const checkedInCount = volunteers?.filter((v: any) => v.checked_in).length || 0;

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Volunteer Coordination</h1>
          <p className="text-muted-foreground">Create volunteer roles, assign volunteers, and manage check-ins.</p>
        </div>
        {selectedTournament && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Role</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Volunteer Role</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Role Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Registration desk, Beverage cart..." /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Max Volunteers</Label><Input type="number" value={form.max_volunteers} onChange={(e) => setForm({ ...form, max_volunteers: e.target.value })} /></div>
                  <div><Label>Time Slot</Label><Input value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} placeholder="7:00 AM - 12:00 PM" /></div>
                </div>
                <Button onClick={() => addRoleMutation.mutate()} disabled={!form.title || addRoleMutation.isPending} className="w-full">
                  {addRoleMutation.isPending ? "Adding..." : "Add Role"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Select value={selectedTournament} onValueChange={setSelectedTournament}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select a tournament" /></SelectTrigger>
        <SelectContent>
          {tournaments?.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Summary Cards */}
      {selectedTournament && (roles?.length ?? 0) > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Roles</span>
              </div>
              <p className="text-2xl font-bold mt-1">{roles?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Volunteers Assigned</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totalVolunteers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Checked In</span>
              </div>
              <p className="text-2xl font-bold mt-1">{checkedInCount}/{totalVolunteers}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTournament && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles?.map((role) => {
            const roleVolunteers = getVolunteersForRole(role.id);
            const spotsLeft = (role.max_volunteers || 1) - roleVolunteers.length;
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{role.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => deleteRoleMutation.mutate(role.id)} className="text-destructive h-7 w-7 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                  {role.time_slot && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />{role.time_slot}
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {roleVolunteers.length}/{role.max_volunteers} filled
                    </span>
                    {spotsLeft > 0 && <Badge variant="secondary" className="text-xs">{spotsLeft} spots left</Badge>}
                  </div>

                  {/* Volunteer list with check-in toggles */}
                  {roleVolunteers.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      {roleVolunteers.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-2 text-sm group">
                          <Checkbox
                            checked={v.checked_in || false}
                            onCheckedChange={(checked) => toggleCheckIn.mutate({ id: v.id, checked_in: !!checked })}
                          />
                          <div className="flex-1 min-w-0">
                            <span className={v.checked_in ? "line-through text-muted-foreground" : ""}>{v.name}</span>
                            <span className="text-muted-foreground ml-1 text-xs">({v.email})</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => removeVolunteerMutation.mutate(v.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assign volunteer button */}
                  {spotsLeft > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => {
                        setAssignRoleId(role.id);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign Volunteer
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {roles?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No volunteer roles yet. Add one to get started.
            </div>
          )}
        </div>
      )}

      {/* Assign Volunteer Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(v) => { setAssignDialogOpen(v); if (!v) { setAssignRoleId(null); setAssignForm({ name: "", email: "", phone: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Volunteer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={assignForm.name} onChange={(e) => setAssignForm({ ...assignForm, name: e.target.value })} placeholder="John Smith" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={assignForm.email} onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })} placeholder="john@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={assignForm.phone} onChange={(e) => setAssignForm({ ...assignForm, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={!assignForm.name || !assignForm.email || assignMutation.isPending}
              className="w-full"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Volunteer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
