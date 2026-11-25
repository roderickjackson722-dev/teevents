# src/pages/dashboard

- Roster column names stay pinned with a mirrored fixed header row in Players.tsx, because a horizontally scrolling table wrapper cannot stick its own header to the window; keep the mirror and the real header rendered from the same header-row component so they stay identical.
- Organizer editor embeds existing photo/media tools with the explicit event ID; standalone and Enterprise screens retain their behavior to avoid cross-event edits.
- Checklist due dates live on the existing event/task progress row; date-only updates preserve completion and existing access rules so teammates share the same tracker.
