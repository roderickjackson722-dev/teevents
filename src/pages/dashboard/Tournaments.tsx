import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trophy, MapPin, Calendar, Loader2, Globe, Lock, Users } from "lucide-react";
import { SCORING_FORMATS } from "@/lib/scoringFormats";

interface Tournament {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  course_name: string | null;
  status: string;
  max_players: number | null;
  registration_open: boolean | null;
  scoring_format: string;
}

const Tournaments = () => {
  const { org } = useOrgContext();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", location: "", course_name: "", scoring_format: "scramble_4" });

  const fetchTournaments = async () => {
    if (!org) return;
    const { data } = await supabase
      .from("tournaments")
      .select("id, title, date, location, course_name, status, max_players, registration_open, scoring_format")
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
    if (!org) return;
    setCreating(true);

    const { error } = await supabase.from("tournaments").insert({
      organization_id: org.orgId,
      title: form.title,
      date: form.date || null,
      location: form.location || null,
      course_name: form.course_name || null,
      scoring_format: form.scoring_format,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tournament created!", description: "Your planning checklist has been generated." });
      setForm({ title: "", date: "", location: "", course_name: "", scoring_format: "scramble_4" });
      setDialogOpen(false);
      fetchTournaments();
    }
    setCreating(false);
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    completed: "bg-secondary/10 text-secondary",
  };

  const isEnterprise = org?.plan === "enterprise";
  const canCreateMore = isEnterprise || tournaments.length < 1;

  return (
    <div>
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
              <div>
                <Label htmlFor="title">Tournament Name *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Annual Charity Golf Classic"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
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

      {!canCreateMore && !loading && (
        <div className="mb-6 bg-secondary/10 border border-secondary/30 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-secondary flex-shrink-0" />
          <p className="text-sm text-foreground">
            Your <span className="font-semibold capitalize">{org?.plan}</span> plan includes 1 tournament. 
            Upgrade to <span className="font-semibold">Enterprise</span> for unlimited tournaments.
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
                <h3 className="font-display font-bold text-foreground text-lg leading-tight">
                  {t.title}
                </h3>
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
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-border">
                <Link
                  to={`/dashboard/tournaments/${t.id}/site-builder`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Edit Site
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
