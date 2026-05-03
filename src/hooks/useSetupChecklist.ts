import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChecklistPhase =
  | "account"
  | "tournament"
  | "promotion"
  | "registration"
  | "pre_tournament"
  | "day_of"
  | "post";

export interface ChecklistTask {
  id: string;
  task_key: string;
  task_name: string;
  description: string | null;
  phase: ChecklistPhase;
  required: boolean;
  link: string | null;
  display_order: number;
  auto_complete: boolean;
}

export interface ChecklistProgress {
  task_id: string;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
}

export interface ChecklistItem extends ChecklistTask {
  status: ChecklistProgress["status"];
  completed_at: string | null;
}

export const PHASE_LABELS: Record<ChecklistPhase, string> = {
  account: "Phase 1: Account",
  tournament: "Phase 2: Tournament Setup",
  promotion: "Phase 3: Promotion & Marketing",
  registration: "Phase 4: Registration & Players",
  pre_tournament: "Phase 5: Pre-Tournament",
  day_of: "Phase 6: Tournament Day",
  post: "Phase 7: After the Tournament",
};

export const PHASE_ORDER: ChecklistPhase[] = [
  "account",
  "tournament",
  "promotion",
  "registration",
  "pre_tournament",
  "day_of",
  "post",
];

export function useSetupChecklist(tournamentId: string | null | undefined) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tournamentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: tasks }, { data: progress }] = await Promise.all([
      supabase
        .from("setup_checklist_tasks")
        .select("*")
        .order("display_order", { ascending: true }),
      supabase
        .from("tournament_setup_progress")
        .select("task_id, status, completed_at")
        .eq("tournament_id", tournamentId),
    ]);

    const progressMap = new Map<string, ChecklistProgress>();
    (progress ?? []).forEach((p: any) => progressMap.set(p.task_id, p));

    const merged: ChecklistItem[] = (tasks ?? []).map((t: any) => {
      const p = progressMap.get(t.id);
      return {
        ...(t as ChecklistTask),
        status: (p?.status as ChecklistItem["status"]) ?? "not_started",
        completed_at: p?.completed_at ?? null,
      };
    });
    setItems(merged);
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback(
    async (taskId: string, status: ChecklistItem["status"]) => {
      if (!tournamentId) return;
      const completed_at = status === "completed" ? new Date().toISOString() : null;
      // Optimistic
      setItems((prev) =>
        prev.map((i) => (i.id === taskId ? { ...i, status, completed_at } : i)),
      );
      const { error } = await supabase
        .from("tournament_setup_progress")
        .upsert(
          { tournament_id: tournamentId, task_id: taskId, status, completed_at },
          { onConflict: "tournament_id,task_id" },
        );
      if (error) {
        // Reload on error
        load();
      }
    },
    [tournamentId, load],
  );

  const recompute = useCallback(async () => {
    if (!tournamentId) return;
    await supabase.functions.invoke("update-checklist-task", {
      body: { tournament_id: tournamentId, recompute: true },
    });
    await load();
  }, [tournamentId, load]);

  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const requiredTotal = items.filter((i) => i.required).length;
  const requiredCompleted = items.filter((i) => i.required && i.status === "completed").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    items,
    loading,
    setStatus,
    reload: load,
    recompute,
    total,
    completed,
    requiredTotal,
    requiredCompleted,
    percent,
  };
}

/**
 * Lightweight helper for save handlers across the dashboard. Marks a task done
 * by `task_key` without needing the full hook lifecycle. Safe to fire-and-forget.
 */
export async function markChecklistTaskComplete(
  tournamentId: string | null | undefined,
  taskKey: string,
) {
  if (!tournamentId) return;
  try {
    await supabase.functions.invoke("update-checklist-task", {
      body: {
        tournament_id: tournamentId,
        task_key: taskKey,
        status: "completed",
      },
    });
  } catch (e) {
    console.warn("markChecklistTaskComplete failed", e);
  }
}
