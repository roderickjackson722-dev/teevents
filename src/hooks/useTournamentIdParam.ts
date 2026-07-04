import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Keeps a tournament selection in sync with the `?tournament_id=` URL query param.
 * This lets admin (or organizer) navigation preserve the currently-selected
 * tournament across dashboard tabs (Scoring, Leaderboard, Players, etc.).
 */
export function useTournamentIdParam(): [string, (id: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get("tournament_id") || "";
  const [selected, setSelected] = useState<string>(urlId);

  // Sync in from URL changes (e.g. navigating from another tab).
  useEffect(() => {
    if (urlId && urlId !== selected) setSelected(urlId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);

  const set = useCallback(
    (id: string) => {
      setSelected(id);
      const next = new URLSearchParams(searchParams);
      if (id) next.set("tournament_id", id);
      else next.delete("tournament_id");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return [selected, set];
}
