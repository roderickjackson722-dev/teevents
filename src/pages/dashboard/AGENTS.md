# src/pages/dashboard

- Roster column names stay pinned with a mirrored fixed header row in Players.tsx, because a horizontally scrolling table wrapper cannot stick its own header to the window; keep the mirror and the real header rendered from the same header-row component so they stay identical.
