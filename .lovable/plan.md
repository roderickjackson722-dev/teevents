# Round-aware organizer scoring, player access, and pairings

## Goal
Make the active round explicit for organizers, automatically advance players past closed rounds, keep each round’s scores and pairings isolated, and correct the ATL Round 2 shotgun/pairings experience.

## Organizer score entry
- Add a **Working Round** selector to the organizer’s Score Entry view, beside the tournament selector.
- Load and edit only the selected round’s scores; include `round_number` in every save, edit-history record, realtime refresh, and offline queue item so Round 2 changes cannot overwrite Round 1.
- Build teams/groups from that round’s saved pairings snapshot rather than the registration row’s currently mirrored group.
- Show the selected round’s status clearly and place the existing **Close Round** action directly on the Score Entry page.
- Disable editing for a closed selected round while still allowing organizers to review it; retain the existing confirmation modal and reopen control.

## Player scoring behavior
- Remove the golfer-facing round dropdown from live scoring.
- On every login/session restore, resolve the first open round after any closed rounds and load only that round. Closed rounds will not be selectable or visible in the player scoring UI.
- Resolve a code to its owning player first, then use that player’s assignment in the selected round to load the full round-specific group. Remove the fallback that silently loads the live registration group when round-specific resolution fails.
- Keep scoring codes stable per player across rounds and ensure save/clear authorization uses the same round-specific group resolution.

## ATL scoring-code correction
- Correct the existing ATL code collision around `7AHWNP` so it identifies Earl Singleton, then ensure other affected players retain valid unique codes.
- Verify Earl’s Round 2 group resolves to Earl Singleton, Sebert Walker, Xavier Proctor, and Hunter Huang.
- Close Round 1 for the ATL Championships after the organizer-facing controls and player auto-advance behavior are in place, so current player logins open Round 2.

## Public pairings page
- Treat the selected/active round’s `startFormat` as authoritative. For a shotgun round, never render per-group tee times, even when stale Round 1 tee-time values remain in legacy group rows.
- Read group membership, starting-hole labels, and ordering from the active round’s saved pairings snapshot so the public page matches the organizer setup.
- Add **Enter Scores** and **Live Leaderboard** buttons. Preserve an optional scoring code from an emailed pairings URL and pass it into Score Entry; otherwise open the normal code-entry screen.
- Update confirmation/reminder pairings links to include the recipient’s scoring code so the Score Entry button can open their group directly.

## Backend changes
- Update the public pairings function to return the active round’s snapshot assignments and suppress tee times for shotgun rounds.
- Update round-aware scoring lookup functions to use a deterministic player-code owner and never choose an arbitrary registration when a legacy group code is duplicated across new-round groups.
- Keep score-write validation and round-lock enforcement in the database.
- Apply the ATL code cleanup as a targeted data update, separate from schema/function migrations.

## Validation
- Add focused tests for: organizer Round 1/2 isolation, closed-round write rejection, automatic player advance, no player round selector, deterministic code-to-Round-2 group resolution, and shotgun pairings with no tee times.
- Verify the public ATL pairings page shows the 9:00 AM shotgun banner, correct Round 2 hole assignments, no individual tee times, and working Score Entry/Leaderboard buttons.
- Verify `7AHWNP` opens Round 2 with Earl, Sebert, Xavier, and Hunter only.
