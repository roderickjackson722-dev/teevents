import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, X } from "lucide-react";

interface Row {
  id: string;
  message: string;
  created_at: string;
}

/**
 * In-dashboard alert banner listing unread "new tournament created" notifications.
 * Dismissing marks them read so the banner stays quiet until the next new event.
 */
export default function NewTournamentAlertBanner() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    (supabase as any)
      .from("admin_notifications")
      .select("id, message, created_at")
      .eq("type", "new_tournament")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => setRows((data || []) as Row[]));
  };

  useEffect(() => {
    load();
  }, []);

  const dismiss = async () => {
    const ids = rows.map((r) => r.id);
    setRows([]);
    if (ids.length) await (supabase as any).from("admin_notifications").update({ is_read: true }).in("id", ids);
  };

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-secondary/40 bg-secondary/10 p-4">
      <div className="flex items-start gap-3">
        <Trophy className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {rows.length === 1 ? "New tournament created" : `${rows.length} new tournaments created`}
          </p>
          <ul className="mt-1 space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="text-sm text-muted-foreground truncate">
                {r.message} · {new Date(r.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
