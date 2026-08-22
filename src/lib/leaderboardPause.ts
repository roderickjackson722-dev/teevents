import { useEffect, useState } from "react";

/**
 * Tiny shared store so the public leaderboard's Pause button can freeze BOTH the
 * LeaderboardCore animations and the page-level rotations/refreshes that live in
 * LiveLeaderboard (flight rotation, banner + gallery rotation, auto refresh).
 */
let paused = false;
const subscribers = new Set<() => void>();

export function isLeaderboardPaused() {
  return paused;
}

export function setLeaderboardPaused(next: boolean) {
  paused = next;
  subscribers.forEach((fn) => fn());
}

export function useLeaderboardPaused(): [boolean, (next: boolean) => void] {
  const [value, setValue] = useState(paused);
  useEffect(() => {
    const fn = () => setValue(paused);
    subscribers.add(fn);
    fn();
    return () => {
      subscribers.delete(fn);
    };
  }, []);
  return [value, setLeaderboardPaused];
}
