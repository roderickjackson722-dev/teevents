import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Note {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingRemindersWidget({ tournamentId }: { tournamentId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!tournamentId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("organizer_notes")
        .select("id, title, due_date, priority")
        .eq("tournament_id", tournamentId)
        .eq("is_completed", false)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(5);
      setNotes((data as Note[]) || []);
    })();
  }, [tournamentId]);

  if (!notes.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Upcoming Reminders
        </h3>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/notes">View All <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </div>
      <ul className="space-y-1.5 text-sm">
        {notes.map((n) => {
          const d = daysUntil(n.due_date!);
          const overdue = d < 0;
          const soon = d >= 0 && d <= 3;
          return (
            <li key={n.id} className="flex items-center justify-between gap-3">
              <span className="truncate">
                <span className="font-medium">{n.title}</span>
                <span className="text-muted-foreground"> — Due {new Date(n.due_date! + "T00:00:00").toLocaleDateString()}</span>
              </span>
              <span className={`text-xs font-medium shrink-0 ${overdue ? "text-red-600" : soon ? "text-orange-600" : "text-muted-foreground"}`}>
                {overdue ? `Overdue ${Math.abs(d)}d` : d === 0 ? "Today" : `${d}d`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
