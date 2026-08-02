import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const STORAGE_KEY = "selectedTournamentId";

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStored(id: string) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Keeps a tournament selection in sync with the `?tournament_id=` URL query param.
 * This lets admin (or organizer) navigation preserve the currently-selected
 * tournament across dashboard tabs (Scoring, Leaderboard, Players, etc.).
 *
 * The URL is the source of truth. When it is missing, the last selection is
 * restored from localStorage and written back into the URL so every subsequent
 * navigation keeps the same tournament instead of falling back to "first in list".
 */
export function useTournamentIdParam(): [string, (id: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get("tournament_id") || "";
  const [selected, setSelected] = useState<string>(() => urlId || readStored());

  // Sync in from URL changes (e.g. navigating from another tab).
  useEffect(() => {
    if (urlId && urlId !== selected) {
      setSelected(urlId);
      writeStored(urlId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);

  // Hydrate the URL from the remembered selection so links keep the context.
  useEffect(() => {
    if (!urlId && selected) {
      const next = new URLSearchParams(searchParams);
      next.set("tournament_id", selected);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId, selected]);

  const set = useCallback(
    (id: string) => {
      setSelected(id);
      writeStored(id);
      const next = new URLSearchParams(searchParams);
      if (id) next.set("tournament_id", id);
      else next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return [selected, set];
}
