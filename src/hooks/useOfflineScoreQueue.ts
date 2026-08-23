import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface QueuedScore {
  tournament_id: string;
  registration_id: string;
  hole_number: number;
  round_number: number;
  strokes: number;
  queued_at: number;
}

const KEY_PREFIX = "teevents.offlineScores.v1.";

function loadQueue(tournamentId: string): QueuedScore[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + tournamentId);
    return raw ? (JSON.parse(raw) as QueuedScore[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(tournamentId: string, q: QueuedScore[]) {
  try {
    if (q.length === 0) localStorage.removeItem(KEY_PREFIX + tournamentId);
    else localStorage.setItem(KEY_PREFIX + tournamentId, JSON.stringify(q));
  } catch {
    // Swallow quota errors; nothing actionable here.
  }
}

/**
 * Offline queue for score submissions. Persists pending upserts to localStorage
 * scoped by tournament and flushes them when connectivity returns.
 */
export function useOfflineScoreQueue(tournamentId: string | null | undefined) {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState<QueuedScore[]>(() =>
    tournamentId ? loadQueue(tournamentId) : []
  );
  const flushingRef = useRef(false);

  useEffect(() => {
    setPending(tournamentId ? loadQueue(tournamentId) : []);
  }, [tournamentId]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const enqueue = useCallback(
    (rows: Omit<QueuedScore, "queued_at">[]) => {
      if (!tournamentId) return;
      const now = Date.now();
      // De-dupe within a round so a later round never overwrites an earlier one.
      const map = new Map<string, QueuedScore>();
      for (const r of loadQueue(tournamentId)) {
        const normalized = { ...r, round_number: r.round_number || 1 };
        map.set(`${r.registration_id}:${normalized.round_number}:${r.hole_number}`, normalized);
      }
      for (const r of rows) {
        map.set(`${r.registration_id}:${r.round_number}:${r.hole_number}`, { ...r, queued_at: now });
      }
      const next = Array.from(map.values());
      saveQueue(tournamentId, next);
      setPending(next);
    },
    [tournamentId]
  );

  const clear = useCallback(() => {
    if (!tournamentId) return;
    saveQueue(tournamentId, []);
    setPending([]);
  }, [tournamentId]);

  const flush = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!tournamentId || flushingRef.current) return { synced: 0, failed: 0 };
    const q = loadQueue(tournamentId);
    if (q.length === 0) return { synced: 0, failed: 0 };
    flushingRef.current = true;
    try {
      const rows = q.map(({ queued_at, ...r }) => r);
      const { error } = await supabase
        .from("tournament_scores")
        .upsert(rows, { onConflict: "registration_id,round_number,hole_number" });
      if (error) {
        return { synced: 0, failed: q.length };
      }
      saveQueue(tournamentId, []);
      setPending([]);
      return { synced: q.length, failed: 0 };
    } finally {
      flushingRef.current = false;
    }
  }, [tournamentId]);

  // Auto-flush when connectivity returns.
  useEffect(() => {
    if (!online || !tournamentId) return;
    if (loadQueue(tournamentId).length === 0) return;
    flush().then((r) => {
      if (r.synced > 0) {
        toast({ title: `Synced ${r.synced} queued score${r.synced === 1 ? "" : "s"}` });
      } else if (r.failed > 0) {
        toast({
          title: "Offline scores still pending",
          description: "We'll retry the next time you're online.",
          variant: "destructive",
        });
      }
    });
  }, [online, tournamentId, flush]);

  return { online, pending, enqueue, flush, clear };
}
