# Public Events + Ticketing

An Eventbrite-style events system with admin management, public browsing, and Stripe-powered ticket purchases. Existing `/events` page (which reads from `tournaments`) will be replaced by the new system.

## Scope

### 1. Database (new migration)
Three new tables in `public`:
- **`public_events`** — id, tournament_id (nullable FK), event_title, event_slug (unique), event_date, event_time, location, address, hero_image_url, description_html, status (`draft|published|archived|sold_out`), featured, created_by, created_at, updated_at.
- **`event_ticket_tiers`** — id, event_id (FK cascade), tier_name, description, price_cents, max_quantity, sold_quantity, display_order.
- **`event_ticket_purchases`** — id, event_id, tier_id, buyer_name, buyer_email, quantity, total_cents, stripe_session_id, stripe_payment_intent_id, payment_status (`pending|paid|refunded`).

RLS + GRANTs:
- Public `SELECT` on `public_events` where `status='published'|'sold_out'|'archived'` and on their tiers.
- Admin-only insert/update/delete (via `has_role(auth.uid(),'admin')`).
- `event_ticket_purchases` — insert via edge function (service role), select by admin only.

### 2. Admin dashboard — "Manage Events"
New route under admin: `/admin/manage-events` linked from the existing **Admin → Platform Tournaments** sidebar area (added as a sibling section "TeeVents Managed Events").

Features:
- List view with title, date/time, location, price range, tickets sold/available, status badge, Edit/Delete.
- Add/Edit modal: title, date, time, location, address, hero image upload (existing storage), rich-text description (simple textarea + basic formatting via `react-quill`-lite — will use a lightweight contentEditable to avoid heavy deps; falls back to plain textarea with markdown), ticket tiers editor (repeatable rows), status select, featured toggle.
- Typed "DELETE" confirmation to remove.
- Auto-generate slug from title (editable).

### 3. Public `/events` page (replaces current one)
Eventbrite-style grid:
- Header: "Upcoming Events" + search input, location filter (state dropdown), date filter (Today / This Week / This Month / All), price range filter.
- Cards: hero image (left on desktop, top on mobile), title, date/time, location, price range, "X sold · Y remaining" or Sold Out badge, "Register Now" button linking to `/events/{slug}`.
- Sections: Upcoming (published) then Past (archived, collapsed).

Note: existing `/events` currently reads from `tournaments` where `managed_by_teevents=true`. We will keep those visible by also merging them into the list (read-only), OR migrate — plan: **merge**. Managed tournaments appear alongside new `public_events`, but only `public_events` support ticketing. Managed tournaments keep their existing external links.

### 4. `/events/{slug}` detail page
- Hero image full width, title, date/time, location.
- Left: description HTML. Right: ticket picker card — tier radio, quantity, live total, "Register Now" button.
- Event Details section.
- SEO tags per event.

### 5. Ticket checkout (Stripe)
New edge function `create-event-ticket-checkout`:
- Input: event_id, tier_id, quantity, buyer name/email (guest OK).
- Validates remaining inventory (`max_quantity - sold_quantity >= quantity`).
- Creates Stripe Checkout session on the **platform account** (these are TeeVents-managed events, not organizer events — no Connect routing needed). Uses `mode: 'payment'`, `customer_email`, `metadata` with event_id/tier_id/quantity, success/cancel URLs pointing to `/events/{slug}?purchase=success|cancel`.
- Inserts `event_ticket_purchases` row with `payment_status='pending'` and `stripe_session_id`.

New edge function `verify-event-ticket`:
- Called from success page with session_id.
- Retrieves session, if `payment_status='paid'`, updates purchase row to `paid` and increments `event_ticket_tiers.sold_quantity` atomically (via a security-definer RPC).
- Sends confirmation email via existing Resend integration.

Both functions listed in `supabase/config.toml` with `verify_jwt = false`.

### 6. Files (new / edited)

**New**
- `supabase/migrations/<ts>_public_events.sql`
- `src/pages/admin/ManageEvents.tsx`
- `src/components/admin/EventEditorModal.tsx`
- `src/components/admin/EventTicketTiersEditor.tsx`
- `src/pages/EventDetail.tsx`
- `src/components/events/EventCard.tsx`
- `src/components/events/EventFilters.tsx`
- `supabase/functions/create-event-ticket-checkout/index.ts`
- `supabase/functions/verify-event-ticket/index.ts`

**Edited**
- `src/pages/Events.tsx` — replace with new grid + filters.
- `src/App.tsx` — add `/events/:slug` and `/admin/manage-events` routes.
- Admin sidebar (wherever Platform Tournaments lives) — add "Manage Events" link.
- `supabase/config.toml` — register the two new edge functions.

### 7. Out of scope (explicit)
- Payouts / Connect routing — TeeVents-managed events run on the platform account.
- Refund UI (admin can refund from Stripe dashboard); refund status column supports future work.
- Rich-text WYSIWYG beyond a simple toolbar (bold/italic/links). If a fuller editor is needed, we can add it in a follow-up.

## Technical notes
- Slugs: `kebab-case(title)` with 6-char random suffix on collision.
- Rich text stored as sanitized HTML (`DOMPurify` on render).
- Inventory increment uses a Postgres RPC `increment_ticket_sold(tier_id uuid, qty int)` with `SECURITY DEFINER` to avoid race conditions.
- Ticket price range on cards = `min(price_cents)`–`max(price_cents)` across tiers.
- Auto-flip status to `sold_out` when every tier is at capacity (trigger on `event_ticket_tiers` after update).

Approve to proceed and I'll ship it as a single migration + code drop.
