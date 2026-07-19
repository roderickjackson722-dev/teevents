## Part 1 — Check-In Roster (Printables)

- Add a new tab **"Check-In Roster"** to `src/pages/dashboard/Printables.tsx`.
- New component `src/components/printables/CheckInRosterTab.tsx`:
  - Controls: Sort By (Alphabetical / Registration Date / Team / Starting Hole / Tee Time), Filter (All / Group / Starting Hole / Tee Time), Layout (Compact 4 per page / Standard 2 per page / Large 1 per page), toggles for QR code, player details, check-in status.
  - Uses the existing `qrcode` client library (already used elsewhere) to render one QR per player pointing at `https://www.teevents.golf/day-of/{slug}/{scoring_code}`.
  - "Print" and "Save as PDF" using existing `openPrintWindow` / `downloadHtmlAsPdf` helpers.
- No DB changes.

## Part 2 — Day-of Link Email (Organizer-controlled)

The existing `supabase/functions/send-day-of-links` already sends per-player links. I'll:
- Embed a scannable QR code image in the email body (via `api.qrserver.com` inline `<img>` — no attachment plumbing needed).
- Add a "Send Day-of Links" card to `src/pages/dashboard/DayOfSettings.tsx` with a **Send Now** button (test email + bulk-send buttons wired to the existing edge function).
- Skipping the scheduled cron variant to stay in scope; organizer triggers manually or via existing test flow.

## Part 3 & 4 — PGA-style Leaderboard + "Presented by" Sponsor

**DB migration** (tournaments):
- `leaderboard_sponsor_name TEXT`
- `leaderboard_sponsor_logo_url TEXT`
- `leaderboard_show_sponsor BOOLEAN DEFAULT false`
- `leaderboard_sponsor_label TEXT DEFAULT 'Presented by'` (Presented by / Sponsored by / In partnership with)
- `leaderboard_title TEXT` (custom title override)

**Dashboard settings** — add a new "Presented By" card in `src/pages/dashboard/Leaderboard.tsx` (or nearest existing leaderboard settings page) with the fields above + logo upload.

**Public leaderboard** (`LeaderboardRenderer` + `LiveLeaderboard.tsx`):
- Header shows large tournament title, subtitle with date & course, and a prominent "Presented by [Sponsor]" strip with the sponsor logo (independent of the existing sponsor-carousel banner).
- Auto-refresh already set to 10s minimum — keep as-is.
- Subtle movement/animation: fade-in on row updates using a CSS transition when scores mutate.
- Meta tags (title/description) updated to include sponsor name for social sharing via existing `SEO` component pattern.

## Out of scope (not touched)

- No changes to scoring formats, RLS, payments, or unrelated dashboard tabs.
- Not building the scheduled-cron auto-send (organizer clicks Send Now instead) — call this out to the user.

## Files touched

- `src/pages/dashboard/Printables.tsx`
- `src/components/printables/CheckInRosterTab.tsx` (new)
- `src/pages/dashboard/DayOfSettings.tsx`
- `src/pages/dashboard/Leaderboard.tsx` (add sponsor settings card)
- `src/components/leaderboard/LeaderboardCore.tsx` (Presented By strip + title/subtitle polish)
- `src/pages/LiveLeaderboard.tsx` (pass new sponsor props, SEO)
- `supabase/functions/send-day-of-links/index.ts` (embed QR image)
- New migration adding 5 columns to `tournaments`
