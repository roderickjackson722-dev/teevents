# Booking System Plan

A complete booking system, scoped to the College Hub admin area, built as reusable components so it can be embedded elsewhere later.

## 1. Database (one migration)

Four new tables:

- `booking_categories` — name, description, color
- `booking_slots` — category_id, title, description, start_time, end_time, location, max_bookings, current_bookings, is_active, created_by
- `booking_reservations` — slot_id, coach_name/email/phone, team_name, notes, booking_reference (auto), status (`confirmed | cancelled | waitlisted`)
- `booking_notification_settings` — admin_email, additional_email, send_on_booking, send_on_cancellation

Plus:
- GRANTs to `authenticated` + `service_role` on every table (anon `SELECT` on `booking_slots` + `booking_categories` so the public page can read availability without login).
- RLS: admins manage everything; anon can `SELECT` active slots/categories and `INSERT` reservations (rate-limited via app logic).
- Trigger to auto-generate `booking_reference` (e.g. `BK-XXXXXX`).
- Trigger to increment/decrement `current_bookings` on reservation insert/cancel.
- Trigger to set status = `waitlisted` if slot is full at insert time.
- `updated_at` triggers where relevant.

## 2. Reusable Components (`src/components/bookings/`)

- `BookingSlotList.tsx` — renders available slots (used by both admin + public views)
- `BookingForm.tsx` — coach booking modal (name/email/phone/team/notes)
- `BookingSlotEditor.tsx` — admin add/edit slot modal
- `BookingCategoryManager.tsx` — categories CRUD table
- `BookingReservationsTable.tsx` — list reservations for a slot (admin)
- `BookingExportMenu.tsx` — CSV / PDF (print window) / ICS export
- `useBookings.ts` — data hook (queries slots, reservations, categories)

Each component accepts an optional `context` string and `categoryId` filter so it can be reused outside the College Hub later.

## 3. Admin Pages

- `src/pages/admin/CollegeHubBookings.tsx` at route `/admin/college-hub/bookings`
  - Tabs: **Slots** | **Categories** | **Notifications** | **Export**
  - Slot cards show date/time/location, `X / Y` spots used, Edit / View Bookings / Delete actions
  - "View Bookings" opens a drawer with the reservations table + per-reservation cancel
- Notifications tab: edit `booking_notification_settings` (admin email, additional email, toggles)

Add a link from the existing College Hub admin page to the new bookings page (single nav entry, no other menu changes).

## 4. Public Booking Page

- `src/pages/CollegeHubBookings.tsx` at route `/college-hub/bookings` (no auth required)
- Read-only list of active, future slots grouped by date
- "Book Now" opens `BookingForm`; on submit calls the edge function
- After success: shows confirmation with booking reference

## 5. Edge Functions

- `supabase/functions/create-booking/index.ts`
  - Validates input (Zod), checks slot capacity, inserts reservation, sends two emails via Resend:
    1. Admin notification (to `admin_email` + `additional_email` if set)
    2. Coach confirmation
  - Returns `{ booking_reference, status }`
- `supabase/functions/cancel-booking/index.ts`
  - Admin-auth required; sets status = `cancelled`, decrements count, emails coach + admin

Both use existing `RESEND_API_KEY` and the `info@notifications.teevents.golf` sender already wired up in `_shared/notify.ts`.

## 6. Exports

- CSV: client-side string build + Blob download
- PDF: reuse `openPrintWindow` from `src/components/printables/printUtils.ts`
- ICS: client-side string build per slot+reservation; downloads a `.ics` file

## 7. Routing

Add 2 routes to `src/App.tsx`:
- `/admin/college-hub/bookings` → `CollegeHubBookings` (admin-gated)
- `/college-hub/bookings` → public booking page

No other routes, menus, or features are touched.

## 8. Out of Scope (per your instructions)

- No changes to existing College Hub content, demo converter, footer system, plans, or any other dashboards.

---

Confirm to proceed and I'll build it end-to-end.
