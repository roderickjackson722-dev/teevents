import { useEffect, useState } from "react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useAdminLink } from "@/hooks/useAdminLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trophy, MapPin, Calendar, Loader2, Globe, Lock, Users, Trash2, Pencil, ClipboardCheck, ArrowRight } from "lucide-react";
import { SCORING_FORMATS } from "@/lib/scoringFormats";

interface Tournament {
  id: string;
  title: string;
  date: string | null;
  end_date: string | null;
  location: string | null;
  course_name: string | null;
  status: string;
  max_players: number | null;
  registration_open: boolean | null;
  scoring_format: string;
}

const Tournaments = () => {
  const { org } = useOrgContext();
  const { buildLink } = useAdminLink();
  const { toast } = useToast();
  const { demoGuard } = useDemoMode();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ date: "", end_date: "", location: "", course_name: "", scoring_format: "scramble_4" });
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Tournament | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const fetchTournaments = async () => {
    if (!org) return;
    const { data } = await supabase
      .from("tournaments")
      .select("id, title, date, end_date, location, course_name, status, max_players, registration_open, scoring_format")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false });
    setTournaments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, [org]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || demoGuard()) return;
    setCreating(true);

    const title = form.course_name
      ? `${form.course_name} Tournament`
      : `${org.orgName || "My"} Golf Tournament`;

    const { error } = await supabase.from("tournaments").insert({
      organization_id: org.orgId,
      title,
      date: form.date || null,
      end_date: form.end_date || null,
      location: form.location || null,
      course_name: form.course_name || null,
      scoring_format: form.scoring_format,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tournament created!", description: "Your planning checklist has been generated." });
      setForm({ date: "", end_date: "", location: "", course_name: "", scoring_format: "scramble_4" });
      setDialogOpen(false);
      fetchTournaments();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteConfirmed || demoGuard()) return;
    setDeleting(true);
    const { error } = await supabase.from("tournaments").delete().eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Error deleting tournament", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tournament deleted", description: `"${deleteTarget.title}" and all associated data has been permanently removed.` });
      fetchTournaments();
    }
    setDeleting(false);
    setDeleteTarget(null);
    setDeleteConfirmed(false);
  };

  const openRename = (t: Tournament) => {
    setRenameTarget(t);
    setRenameValue(t.title);
  };

  const handleRename = async () => {
    if (!renameTarget || demoGuard()) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast({ title: "Name required", description: "Please enter a tournament name.", variant: "destructive" });
      return;
    }
    setRenaming(true);
    // Fetch current site_hero_title so we only overwrite it when it was empty or
    // mirroring the old auto-generated title (keeps an intentionally diverged
    // public Hero Title intact).
    const { data: existing } = await supabase
      .from("tournaments")
      .select("title, site_hero_title")
      .eq("id", renameTarget.id)
      .single();

    const updates: Record<string, any> = { title: trimmed };
    const currentHero = (existing as any)?.site_hero_title?.trim() || "";
    const oldTitle = (existing as any)?.title?.trim() || "";
    if (!currentHero || currentHero === oldTitle) {
      updates.site_hero_title = trimmed;
    }

    const { data: updated, error } = await supabase
      .from("tournaments")
      .update(updates)
      .eq("id", renameTarget.id)
      .select("id, title")
      .single();

    if (error || !updated) {
      toast({
        title: "Error renaming tournament",
        description: error?.message || "No rows were updated. You may not have permission to edit this tournament.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tournament renamed",
        description: "The new name is now used across your dashboard and public site.",
      });
      setRenameTarget(null);
      await fetchTournaments();
    }
    setRenaming(false);
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    completed: "bg-secondary/10 text-secondary",
  };

  const canCreateMore = tournaments.length < 1;

  return (
    <div>
      {/* Setup Checklist pointer */}
      <div className="mb-6 rounded-lg border border-secondary/40 bg-secondary/10 p-4 flex items-start gap-3">
        <ClipboardCheck className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">New here? Start with your Setup Checklist.</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Begin on the <strong>Tournament Details</strong> page below, then follow the step-by-step
            Setup Checklist to launch your tournament. Tasks auto-complete as you save your work.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="flex-shrink-0">
          <Link to={buildLink("/dashboard/setup-checklist")}>
            Open Checklist
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tournaments</h1>
          <p className="text-muted-foreground mt-1">Create and manage your golf tournaments.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canCreateMore}>
              {canCreateMore ? <Plus className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              New Tournament
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Tournament</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Start Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    min={form.date || undefined}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank for single-day</p>
                </div>
              </div>
              <div>
                <Label htmlFor="course">Golf Course</Label>
                <Input
                  id="course"
                  value={form.course_name}
                  onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                  placeholder="e.g. Pine Valley Golf Club"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Dallas, TX"
                />
              </div>
              <div>
                <Label className="mb-2 block">Scoring Format</Label>
                <div className="grid gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {SCORING_FORMATS.map((fmt) => (
                    <button
                      type="button"
                      key={fmt.id}
                      onClick={() => setForm({ ...form, scoring_format: fmt.id })}
                      className={`text-left rounded-lg border-2 p-3 transition-all ${
                        form.scoring_format === fmt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{fmt.name}</span>
                        {fmt.teamSize > 1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />{fmt.teamSize}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{fmt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Tournament
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rename Tournament Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Tournament Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="rename-input">Tournament Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="e.g. Annual Charity Classic"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-2">
                This name is used across your dashboard, emails, share links, and your public site's <strong>Hero Title</strong>. If you've already customized the Hero Title in Site Builder, that custom value is preserved.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={renaming}>Cancel</Button>
              <Button onClick={handleRename} disabled={renaming}>
                {renaming && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Name
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmed(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-display">Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to permanently delete <strong className="text-foreground">"{deleteTarget?.title}"</strong>.
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
                <strong>⚠️ Warning:</strong> This action cannot be undone. The following data will be permanently lost:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All player registrations</li>
                  <li>Scores and leaderboard data</li>
                  <li>Sponsors and budget items</li>
                  <li>Messages, photos, and surveys</li>
                  <li>Auction items and donations</li>
                  <li>Tournament website and all settings</li>
                </ul>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="confirm-delete"
                  checked={deleteConfirmed}
                  onCheckedChange={(v) => setDeleteConfirmed(v === true)}
                />
                <label htmlFor="confirm-delete" className="text-sm text-foreground cursor-pointer leading-tight">
                  I understand that all tournament data will be permanently deleted and cannot be recovered.
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!deleteConfirmed || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!canCreateMore && !loading && (
        <div className="mb-6 bg-secondary/10 border border-secondary/30 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-secondary flex-shrink-0" />
           <p className="text-sm text-foreground">
            Your <span className="font-semibold capitalize">{org?.plan}</span> plan includes 1 tournament. 
            Contact us for multi-tournament options.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-lg border border-border">
          <Trophy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
          <p className="text-muted-foreground mb-6">Create your first tournament to get started.</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Tournament
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground text-lg leading-tight">
                    {t.title}
                  </h3>
                  <button
                    onClick={() => openRename(t)}
                    className="text-muted-foreground hover:text-primary transition-colors mt-0.5"
                    title="Edit tournament name"
                    aria-label="Edit tournament name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[t.status] || statusColors.draft}`}>
                  {t.status}
                </span>
              </div>
              {t.course_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {t.course_name}
                </p>
              )}
              {t.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t.location}
                </p>
              )}
              {t.date && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(t.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {t.end_date && t.end_date !== t.date && (
                    <span>
                      {" – "}
                      {new Date(t.end_date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </p>
              )}
              {(() => {
                const fmt = SCORING_FORMATS.find(f => f.id === (t as any).scoring_format);
                return fmt ? (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {fmt.name}
                  </p>
                ) : null;
              })()}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <Link
                  to={buildLink(`/dashboard/tournaments/${t.id}/site-builder`)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Edit Site
                </Link>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
