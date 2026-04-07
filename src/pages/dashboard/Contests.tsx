import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Trophy, GripVertical, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

interface Contest {
  id?: string;
  tournament_id: string;
  name: string;
  description: string | null;
  icon: string;
  fee_cents: number;
  is_active: boolean;
  sort_order: number;
}

const ICON_OPTIONS = ["🏌️", "🎯", "🕳️", "🏆", "💰", "🎲", "⛳", "🥇", "🎉", "🏅"];

const Contests = () => {
  const { org } = useOrgContext();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<{ id: string; title: string }[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New contest form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🏆");
  const [newFee, setNewFee] = useState("");

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const t = data || [];
        setTournaments(t);
        if (t.length > 0) setSelectedTournament(t[0].id);
        setLoading(false);
      });
  }, [org]);

  const fetchContests = useCallback(async (tid: string) => {
    if (!tid) return;
    setLoading(true);
    const { data } = await supabase
      .from("tournament_contests")
      .select("*")
      .eq("tournament_id", tid)
      .order("sort_order");
    setContests((data as Contest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTournament) fetchContests(selectedTournament);
  }, [selectedTournament, fetchContests]);

  const addContest = async () => {
    if (!newName.trim() || demoGuard()) return;
    const payload: any = {
      tournament_id: selectedTournament,
      name: newName.trim(),
      description: newDesc.trim() || null,
      icon: newIcon,
      fee_cents: Math.round(parseFloat(newFee || "0") * 100),
      is_active: true,
      sort_order: contests.length,
    };
    const { data, error } = await supabase.from("tournament_contests").insert(payload).select("*").single();
    if (error) toast.error(error.message);
    else {
      setContests((prev) => [...prev, data as Contest]);
      setNewName("");
      setNewDesc("");
      setNewIcon("🏆");
      setNewFee("");
      toast.success("Contest added!");
    }
  };

  const toggleContest = async (contest: Contest) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_contests")
      .update({ is_active: !contest.is_active } as any)
      .eq("id", contest.id!);
    if (error) toast.error(error.message);
    else setContests((prev) => prev.map((c) => (c.id === contest.id ? { ...c, is_active: !c.is_active } : c)));
  };

  const deleteContest = async (id: string) => {
    if (demoGuard()) return;
    const { error } = await supabase.from("tournament_contests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      setContests((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contest removed");
    }
  };

  const updateContest = async (contest: Contest) => {
    if (demoGuard()) return;
    const { error } = await supabase
      .from("tournament_contests")
      .update({
        name: contest.name,
        description: contest.description,
        icon: contest.icon,
        fee_cents: contest.fee_cents,
      } as any)
      .eq("id", contest.id!);
    if (error) toast.error(error.message);
    else {
      setEditingId(null);
      toast.success("Contest updated!");
    }
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-foreground mb-2">No Tournaments Yet</h2>
        <p className="text-muted-foreground">Create a tournament first to manage contests.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Event Day Contests</h1>
          <p className="text-muted-foreground mt-1">Manage contests that appear on your tournament's public page.</p>
        </div>
        {tournaments.length > 1 && (
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {contests.map((contest) => (
          <div key={contest.id} className="rounded-lg border bg-card p-4 flex items-start gap-4">
            <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0 cursor-grab" />
            {editingId === contest.id ? (
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={contest.name} onChange={(e) => setContests((p) => p.map((c) => c.id === contest.id ? { ...c, name: e.target.value } : c))} />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <Select value={contest.icon} onValueChange={(v) => setContests((p) => p.map((c) => c.id === contest.id ? { ...c, icon: v } : c))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={contest.description || ""} onChange={(e) => setContests((p) => p.map((c) => c.id === contest.id ? { ...c, description: e.target.value } : c))} rows={2} />
                </div>
                <div className="w-40">
                  <Label>Fee ($)</Label>
                  <Input type="number" min="0" step="0.01" value={(contest.fee_cents / 100).toFixed(2)} onChange={(e) => setContests((p) => p.map((c) => c.id === contest.id ? { ...c, fee_cents: Math.round(parseFloat(e.target.value || "0") * 100) } : c))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateContest(contest)}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-2xl shrink-0">{contest.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{contest.name}</h3>
                    {contest.fee_cents > 0 && (
                      <Badge variant="secondary" className="text-xs">${(contest.fee_cents / 100).toFixed(2)}</Badge>
                    )}
                    {!contest.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  {contest.description && <p className="text-sm text-muted-foreground mt-0.5">{contest.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={contest.is_active} onCheckedChange={() => toggleContest(contest)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(contest.id!)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteContest(contest.id!)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
        {contests.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No contests yet. Add your first one below.</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Contest
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Contest Name *</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Longest Drive" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Icon</Label>
              <Select value={newIcon} onValueChange={setNewIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fee ($)</Label>
              <Input type="number" min="0" step="0.01" value={newFee} onChange={(e) => setNewFee(e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description of the contest" rows={2} />
        </div>
        <Button onClick={addContest} disabled={!newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add Contest
        </Button>
      </div>
    </div>
  );
};

export default Contests;
