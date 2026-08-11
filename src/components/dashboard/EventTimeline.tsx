import { CalendarClock, CheckCircle2, Circle } from "lucide-react";

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

function formatDue(eventDate: string | null, offsetDays: number) {
  if (!eventDate) return "Set an event date";
  const d = new Date(eventDate + "T00:00:00");
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EventTimeline({
  eventDate,
  title,
}: {
  eventDate: string | null;
  title?: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{m.label}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Due: {formatDue(eventDate, m.offsetDays)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
