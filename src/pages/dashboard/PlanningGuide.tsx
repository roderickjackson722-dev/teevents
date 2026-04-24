import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Trophy, Loader2, CheckCircle2, AlertCircle, CalendarX } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sort_order: number | null;
  is_completed: boolean | null;
  due_date: string | null;
  offset_days: number | null;
}

interface Tournament {
  id: string;
  title: string;
  date: string | null;
}

const categoryLabels: Record<string, string> = {
  "12_months": "12 Months Before",
  "6_months": "6 Months Before",
  "3_months": "3 Months Before",
  "1_month": "1 Month Before",
  "week_of": "Week of Event",
  "post_event": "Post Event",
};

const categoryOrder = ["12_months", "6_months", "3_months", "1_month", "week_of", "post_event"];

const PlanningGuide = () => {
  const { org } = useOrgContext();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from("tournaments")
      .select("id, title, date")
      .eq("organization_id", org.orgId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setTournaments(list);
        if (list.length > 0) setSelectedTournament(list[0].id);
        setLoading(false);
      });
  }, [org]);

  useEffect(() => {
    if (!selectedTournament) return;
    setLoading(true);
    supabase
      .from("tournament_checklist_items")
      .select("*")
      .eq("tournament_id", selectedTournament)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [selectedTournament]);

  const toggleItem = async (itemId: string, currentValue: boolean | null) => {
    const newValue = !currentValue;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_completed: newValue } : i))
    );
    await supabase
      .from("tournament_checklist_items")
      .update({ is_completed: newValue })
      .eq("id", itemId);
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentTournament = tournaments.find((t) => t.id === selectedTournament);
  const tournamentDate = currentTournament?.date || null;

  const formatDueDate = (dueDate: string | null, offset: number | null) => {
    if (!dueDate) return null;
    const d = new Date(dueDate + "T00:00:00");
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (offset === 0) return "Event day";
    return formatted;
  };

  const isOverdue = (dueDate: string | null, completed: boolean | null) => {
    if (!dueDate || completed) return false;
    const d = new Date(dueDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const groupedItems = categoryOrder.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-lg border border-border">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-display font-bold text-foreground mb-2">No tournaments yet</h3>
        <p className="text-muted-foreground">Create a tournament first to see your planning guide.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tournament Planning Guide</h1>
          <p className="text-muted-foreground mt-1">
            Step-by-step checklist to ensure a successful tournament.
          </p>
        </div>
        <Select value={selectedTournament} onValueChange={setSelectedTournament}>
          <SelectTrigger className="w-[280px] bg-card">
            <Trophy className="h-4 w-4 mr-2 text-primary" />
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border p-5 mb-8"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {totalCount} completed
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-secondary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
      </motion.div>

      {/* No tournament date warning */}
      {!tournamentDate && !loading && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <CalendarX className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Set tournament date to see due dates</p>
            <p className="text-muted-foreground mt-0.5">
              Add a start date to your tournament so we can automatically calculate when each task is due.
            </p>
          </div>
        </div>
      )}

      {tournamentDate && (
        <p className="text-sm text-muted-foreground mb-6">
          Tournament starts <span className="font-semibold text-foreground">
            {new Date(tournamentDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>. Due dates are calculated automatically.
        </p>
      )}

      {/* Checklist */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {categoryOrder.map((cat) => {
            const catItems = groupedItems[cat];
            if (!catItems) return null;
            const catCompleted = catItems.filter((i) => i.is_completed).length;
            const catTotal = catItems.length;

            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {categoryLabels[cat] || cat}
                  </h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {catCompleted}/{catTotal}
                  </span>
                </div>
                <div className="bg-card rounded-lg border border-border divide-y divide-border">
                  {catItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                        item.is_completed ? "opacity-60" : ""
                      }`}
                    >
                      <Checkbox
                        checked={!!item.is_completed}
                        onCheckedChange={() => toggleItem(item.id, item.is_completed)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            item.is_completed
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.is_completed && (
                        <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                      )}
                    </label>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlanningGuide;
