import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChecklistItem,
  PHASE_LABELS,
  PHASE_ORDER,
  useSetupChecklist,
} from "@/hooks/useSetupChecklist";

interface Props {
  tournamentId: string;
  /** Compact: show only the next 4–5 incomplete tasks (for dashboard home card). */
  compact?: boolean;
  /** Show the "Hide" / dismiss button. */
  onDismiss?: () => void;
  /** When true, runs the smart auto-detect recompute on mount. */
  autoRecompute?: boolean;
}

export default function SetupChecklist({ tournamentId, compact = false, onDismiss, autoRecompute = false }: Props) {
  const { items, loading, setStatus, percent, completed, total, recompute } = useSetupChecklist(tournamentId);

  useEffect(() => {
    if (autoRecompute && tournamentId) {
      recompute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRecompute, tournamentId]);

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (items.length === 0) return null;

  // Group by phase
  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    label: PHASE_LABELS[phase],
    tasks: items.filter((i) => i.phase === phase),
  })).filter((g) => g.tasks.length > 0);

  // For compact mode show next 5 incomplete
  const compactTasks = items.filter((i) => i.status !== "completed").slice(0, 5);

  return (
    <Card className="overflow-hidden border-2 border-secondary/30">
      <div className="bg-gradient-to-r from-secondary/15 to-primary/10 p-5 sm:p-6 border-b border-border">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">
                Setup Checklist
              </h2>
              <p className="text-sm text-muted-foreground">
                Get your tournament live and ready for registration.
              </p>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Hide
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Progress value={percent} className="h-2 flex-1" />
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">
            {completed} of {total} · {percent}%
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {compact ? (
          <>
            {compactTasks.length === 0 ? (
              <p className="text-sm text-secondary font-medium">
                🎉 You've completed every setup task. Nice work!
              </p>
            ) : (
              <ul className="space-y-2">
                {compactTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    tournamentId={tournamentId}
                    onToggle={(s) => setStatus(task.id, s)}
                  />
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/setup-checklist">View all tasks</Link>
              </Button>
            </div>
          </>
        ) : (
          grouped.map((group) => {
            const groupDone = group.tasks.filter((t) => t.status === "completed").length;
            return (
              <div key={group.phase}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-display font-bold text-foreground uppercase tracking-wide">
                    {group.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {groupDone}/{group.tasks.length} completed
                  </span>
                </div>
                <ul className="space-y-2">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      tournamentId={tournamentId}
                      onToggle={(s) => setStatus(task.id, s)}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function TaskRow({
  task,
  tournamentId,
  onToggle,
}: {
  task: ChecklistItem;
  tournamentId: string;
  onToggle: (status: ChecklistItem["status"]) => void;
}) {
  const isDone = task.status === "completed";
  // Interpolate {tid} in stored link templates so each task opens the
  // currently-selected tournament's page.
  const resolvedLink = task.link ? task.link.replace(/\{tid\}/g, tournamentId) : null;
  return (
    <li className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <button
        type="button"
        onClick={() => onToggle(isDone ? "not_started" : "completed")}
        className="mt-0.5 flex-shrink-0"
        aria-label={isDone ? "Mark as not started" : "Mark as completed"}
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-secondary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-medium ${
              isDone ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {task.task_name}
          </span>
          {!task.required && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              Optional
            </Badge>
          )}
        </div>
        {task.description && !isDone && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
        )}
      </div>
      {resolvedLink && (
        <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
          <Link to={resolvedLink}>
            Go <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      )}
    </li>
  );
}

