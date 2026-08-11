import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface Milestone {
  label: string;
  task: string;
  offsetDays: number; // days before event (0 = event day)
}

const MILESTONES: Milestone[] = [
  { label: "12 months out", task: "Course selection", offsetDays: 365 },
  { label: "6 months out", task: "Sponsor recruitment", offsetDays: 182 },
  { label: "3 months out", task: "Registration opens", offsetDays: 91 },
  { label: "1 month out", task: "Finalize pairings", offsetDays: 30 },
  { label: "1 week out", task: "Finalize tee times", offsetDays: 7 },
  { label: "1 day out", task: "Send reminder email", offsetDays: 1 },
  { label: "Event day", task: "Tournament begins", offsetDays: 0 },
];

interface TimelineItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sort_order: number | null;
  is_completed: boolean | null;
  due_date: string | null;
  offset_days: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  "12_months": "12 Months Before",
  "6_months": "6 Months Before",
  "3_months": "3 Months Before",
  "1_month": "1 Month Before",
  week_of: "Week of Event",
  post_event: "Post Event",
};

const CATEGORY_ORDER = [
  "12_months",
  "6_months",
  "3_months",
  "1_month",
  "week_of",
  "post_event",
];

function formatDue(eventDate: string | null, offsetDays: number) {
  if (!eventDate) return "Set an event date";
  const d = new Date(eventDate + "T00:00:00");
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventTimeline({
  eventDate,
  title,
  tournamentId,
}: {
  eventDate: string | null;
  title?: string;
  tournamentId?: string | null;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(!!tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("tournament_checklist_items")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data as TimelineItem[]) || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  const toggleItem = async (itemId: string, current: boolean | null) => {
    const next = !current;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_completed: next } : i)),
    );
    await supabase
      .from("tournament_checklist_items")
      .update({ is_completed: next })
      .eq("id", itemId);
  };

  const isOverdue = (dueDate: string | null, completed: boolean | null) => {
    if (!dueDate || completed) return false;
    return new Date(dueDate + "T00:00:00").getTime() < today.getTime();
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-5 w-5 text-secondary" />
        <h2 className="text-lg font-display font-bold text-foreground">Timeline & Due Dates</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {title ? `${title} — key milestones` : "Key milestones"}
        {!eventDate && " (add an event date to see exact due dates)"}
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : items.length > 0 ? (
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">Timeline progress</span>
              <span className="text-xs text-muted-foreground">
                {completedCount} of {items.length} complete
              </span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="space-y-7">
            {CATEGORY_ORDER.map((cat) => {
              const catItems = items.filter((i) => i.category === cat);
              if (catItems.length === 0) return null;
              const catDone = catItems.filter((i) => i.is_completed).length;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-display font-bold uppercase tracking-wide text-foreground">
                      {CATEGORY_LABELS[cat] || cat}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {catDone}/{catItems.length}
                    </span>
                  </div>
                  <ol className="relative border-l border-border ml-3 space-y-4">
                    {catItems.map((item) => {
                      const overdue = isOverdue(item.due_date, item.is_completed);
                      return (
                        <li key={item.id} className="ml-6">
                          <span className="absolute -left-[11px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card">
                            {item.is_completed ? (
                              <CheckCircle2 className="h-5 w-5 text-secondary" />
                            ) : (
                              <Circle
                                className={`h-4 w-4 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                              />
                            )}
                          </span>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={!!item.is_completed}
                              onCheckedChange={() => toggleItem(item.id, item.is_completed)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={`text-sm font-semibold ${
                                    item.is_completed
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {item.title}
                                </p>
                                {item.due_date && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                      overdue
                                        ? "bg-destructive/10 text-destructive border border-destructive/30"
                                        : item.offset_days === 0
                                          ? "bg-primary/10 text-primary border border-primary/30"
                                          : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {overdue && <AlertCircle className="h-3 w-3" />}
                                    {item.offset_days === 0
                                      ? "Event day"
                                      : `Due: ${formatDate(item.due_date)}`}
                                    {overdue && " · Overdue"}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-5">
          {MILESTONES.map((m) => {
            let past = false;
            if (eventDate) {
              const due = new Date(eventDate + "T00:00:00");
              due.setDate(due.getDate() - m.offsetDays);
              past = due.getTime() < today.getTime();
            }
            return (
              <li key={m.label} className="ml-6">
                <span className="absolute -left-[11px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-card">
                  {past ? (
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                  <p className="font-semibold text-foreground text-sm">{m.task}</p>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {m.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Due: {formatDue(eventDate, m.offsetDays)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
