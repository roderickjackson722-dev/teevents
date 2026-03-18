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
import { Users, Plus, Trash2, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Volunteers() {
  const { org, loading: orgLoading } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const queryClient = useQueryClient();
  const [selectedTournament, setSelectedTournament] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", max_volunteers: "4", time_slot: "" });

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
      const { error } = await supabase.from("tournament_volunteer_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volunteer-roles"] });
      toast({ title: "Role removed" });
    },
  });

  const getVolunteersForRole = (roleId: string) => volunteers?.filter((v) => v.role_id === roleId) || [];

  if (orgLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Volunteer Coordination</h1>
          <p className="text-muted-foreground">Create volunteer roles and manage signups.</p>
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
                  {role.time_slot && <Badge variant="outline" className="text-xs">{role.time_slot}</Badge>}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {roleVolunteers.length}/{role.max_volunteers} filled
                    </span>
                    {spotsLeft > 0 && <Badge variant="secondary" className="text-xs">{spotsLeft} spots left</Badge>}
                  </div>
                  {roleVolunteers.length > 0 && (
                    <div className="space-y-1">
                      {roleVolunteers.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 text-sm">
                          <UserCheck className="h-3 w-3 text-primary" />
                          <span>{v.name}</span>
                          <span className="text-muted-foreground">({v.email})</span>
                        </div>
                      ))}
                    </div>
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
    </div>
  );
}
