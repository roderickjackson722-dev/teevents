# Archived: Arlington County RFP Features

Archived 2026-09-30 — the bid was not won. Kept in case the opportunity reopens.

## What was removed from the live app

- Admin dashboard launcher: `RfpFeaturesPanel` (was rendered in `src/pages/AdminDashboard.tsx`)
- Admin routes in `src/App.tsx`: `/admin/sports`, `/admin/seasons`, `/admin/facilities`,
  `/admin/financial-reports`, `/admin/transition-plan`, `/admin/invoices`,
  `/admin/registrations`, `/admin/registration-payments`, `/admin/scheduling`,
  `/admin/communications`, and public `/rfp/register/:slug`
- API route: `/api/public/hooks/process-rfp-communications`

## What stayed in the live app

- `src/pages/admin/rfp/ClippdIntegration.tsx` and `src/components/admin/RfpAdminGate.tsx` —
  still used by College Hub (`/admin/clippd` route kept).

## To restore

1. Move these files back to their original paths:
   - `pages/admin/rfp/*.tsx` → `src/pages/admin/rfp/`
   - `pages/rfp/PublicRegistration.tsx` → `src/pages/rfp/`
   - `components/admin/RfpFeaturesPanel.tsx` → `src/components/admin/`
   - `api/process-rfp-communications.ts` → `src/routes/api/public/hooks/`
2. Re-add the imports and routes in `src/App.tsx` (see git history for the exact block).
3. Re-add `<RfpFeaturesPanel />` in `src/pages/AdminDashboard.tsx` below `<NewTournamentAlertBanner />`.
