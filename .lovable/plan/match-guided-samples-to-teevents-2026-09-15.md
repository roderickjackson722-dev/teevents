# Match Guided Samples to TeeVents

## What will change
- Rework the generated sample page to use the same visual structure and controls as a live TeeVents tournament page.
- Replace the registration toast with a realistic, non-submitting registration preview showing player, team, contact, handicap, and event questions.
- Restyle the embedded and TV leaderboard samples to match the live TeeVents leaderboard while using the customer’s logo and selected colors.
- Carry the chosen primary and secondary colors through the event page, registration preview, leaderboard, mobile scoring, and dashboard preview.
- Add a short note explaining that organizers can customize these colors and branding.
- Show a faithful organizer dashboard preview near the end of the tour, with the same menu, header, event selector, summary cards, roster/pairings entry, and common management options.
- Keep the guided experience focused on the four primary areas, while the final screen explains that the organizer dashboard contains additional options.

## Guided tour behavior
1. Welcome
2. Branded event page
3. Registration form preview
4. Live leaderboard
5. Mobile scoring
6. Organizer dashboard preview and next-step choices

The tour will keep arrows, highlights, progress, Back/Next/Skip controls, first-visit auto-start, and replay.

## Technical details
- Reuse existing TeeVents layout patterns and controls rather than maintaining a separate visual language.
- Keep all sample interactions isolated from live tournament records and payments.
- Preserve share links and existing sample generation.
- Verify the generated sample, registration click-through, leaderboard, mobile scoring, dashboard preview, replay, and final actions at desktop and mobile sizes.