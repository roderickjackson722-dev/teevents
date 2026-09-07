import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sortTournamentsForPicker } from "@/lib/tournamentOrder";

type T = { id: string; title: string; date: string | null };

/**
 * Header event switcher for organizations running more than one tournament at
 * once. Writing the selection to both the URL and the remembered selection key
 * keeps every dashboard tab on the same event instead of bouncing back to the
 * first/last tournament.
 */
export default function DashboardEventSwitcher({ orgId }: { orgId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState<T[]>([]);
  const selected = searchParams.get("tournament_id") || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("id, title, date")
        .eq("organization_id", orgId)
        .order("date", { ascending: true });
      if (!cancelled) setList(sortTournamentsForPicker(((data as T[]) || []) as any) as unknown as T[]);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  if (list.length < 2) return null;

  const onChange = (id: string) => {
    try {
      if (id) localStorage.setItem("selectedTournamentId", id);
      else localStorage.removeItem("selectedTournamentId");
    } catch { /* ignore */ }
    const next = new URLSearchParams(searchParams);
    if (id) next.set("tournament_id", id);
    else next.delete("tournament_id");
    setSearchParams(next, { replace: true });
  };

  return (
    <select
      aria-label="Switch event"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-[220px] shrink-0 truncate rounded-md border border-secondary/60 bg-background px-2 text-sm font-medium"
    >
      <option value="">All events</option>
      {list.map((t) => (
        <option key={t.id} value={t.id}>
          {t.title}
          {t.date ? ` — ${new Date(t.date + "T00:00:00").toLocaleDateString()}` : ""}
        </option>
      ))}
    </select>
  );
}
