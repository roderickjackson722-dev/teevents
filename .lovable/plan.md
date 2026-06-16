# Dashboard Updates — Implementation Plan

This is a large, multi-area change. I want to confirm scope and sequencing before editing 25+ files so nothing else on the platform breaks.

## Part 1 — Global "Save Changes" button (23 pages)
Create a reusable `<StickySaveBar onSave />` component (fixed bottom-right, TeeVents green `#1a5c38`, white text, toast on success). Wire it into each listed page by:
- Tracking a `dirty` flag in each page
- Calling the page's existing save handler from the bar
- Showing toast "Changes saved successfully"

Pages already auto-save on each field — for those I'll wire the bar to a no-op "Save & confirm" that flushes any pending state and shows the toast, so the UX is consistent without rewriting working save logic.

## Part 2 — Handicap simplification
- `DashboardSidebar.tsx`: rename "Handicap Settings" → "Handicap"
- `HandicapSettings.tsx` (or the page that wraps it): remove Scoring Links / QR Codes / Player Codes / Live Settings sub-sections (they already exist on Scoring tab, verified)

## Part 3 — Tournament Details → Content tab
- Remove `Registration URL (external)` field
- Remove `Registration Fee (USD)` field
- Add `Contact Name` field in the Contact box (new column `contact_name` on `tournaments` if not present — I'll check first and add a migration only if needed)

## Part 4 — Printables
- Sidebar: move "Printables" from Promotion & Marketing → Event Day
- Remove "Hole-by-Hole Par" option from `PrintableSettings.tsx`
- Add logo upload (stored on the tournament's existing logo field or a new `printable_logo_url`) with live preview in the existing `ScorecardMiniPreview`

## Part 5 — Sponsorship quantity
In `SponsorshipTiersManager.tsx`:
- Add `show_remaining` boolean per tier (default false) — needs column on `sponsorship_tiers`
- Remove "Sold Out" rendering when `quantity` is null
- Public display: only show "X spots remaining" when `show_remaining=true` AND `quantity` is set

## Part 6 — Players & Pairings hole text
Change hole input from `<Input type="number">` to `<Input type="text">` in `Players.tsx` + `HoleAssignmentsTab.tsx`. The DB column `group_number` is integer — I'll either:
- (a) add a sibling `group_label` text column for display, keeping numeric sort, OR
- (b) change the column to text

Recommendation: **(a)** — preserves existing numeric logic for tee sheets, scoring, printables.

## Part 7 — Photo Gallery
In `PhotoGalleryManager.tsx`:
- Remove auto-generated "Cropped 123456" caption text
- Switch crop component to free-form (no fixed aspect ratio)

## Part 8 — Day of Event Page
- Remove Pin Sheet Placements section (if any remain after prior cleanup)
- Debug `WeatherWidget.tsx` — it already uses Open-Meteo; likely failing because `location` is empty/null. Add fallback UI "Weather data unavailable" when geocoding or fetch fails (currently returns null on error)

## Part 9 — Sidebar reorganization
In `DashboardSidebar.tsx`:
- Delete "Post-Event" group
- Move "Surveys & Feedback" → Promotion & Marketing
- Move "Email Templates" → nested under Surveys & Feedback (sub-item)
- Verify final structure matches the spec exactly

## Migrations needed
1. `tournaments.contact_name text` (Part 3)
2. `sponsorship_tiers.show_remaining boolean default false` (Part 5)
3. `tournament_registrations.group_label text` (Part 6)
4. (maybe) `tournaments.printable_logo_url text` (Part 4) — or reuse `site_logo_url`

## Confirmations before I start
1. **Part 1 auto-save pages**: OK to make the Save button a "flush + confirm" UX rather than refactoring every page's save logic?
2. **Part 6**: Add `group_label` text alongside numeric `group_number` (recommended) — OK?
3. **Part 4 logo**: Reuse the existing `site_logo_url`, or add a separate `printable_logo_url`?
4. **Part 3 Contact Name**: New DB column `contact_name` — confirm OK to add.

Once you confirm, I'll execute all 9 parts in parallel batches.