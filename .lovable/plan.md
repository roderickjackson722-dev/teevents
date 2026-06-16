# Demo Conversion: 72‑Hour Window + Discount Controls

Extends the existing `demo_tournaments` flow (legacy table used by `/admin/demo-converter` and `convert-demo-to-live`) — **not** the newer real-demo flow on `tournaments`. That keeps both pipelines working.

## 1. Database (migration)

Add to `demo_tournaments`:
- `conversion_token TEXT UNIQUE` (already exists as `conversion_token` — reuse)
- `conversion_sent_at TIMESTAMPTZ`
- `conversion_expires_at TIMESTAMPTZ`
- `conversion_discount_type TEXT CHECK IN ('none','percentage','fixed','free_pro')`
- `conversion_discount_value INTEGER`
- `conversion_status TEXT DEFAULT 'pending' CHECK IN ('pending','sent','expired','claimed','test')`
- `claimed_by UUID REFERENCES auth.users(id)`
- `claimed_at TIMESTAMPTZ`
- `is_test_conversion BOOLEAN DEFAULT false`
- `test_converted_at TIMESTAMPTZ`

New table `demo_conversion_discounts` (id, demo_tournament_id FK, discount_type, discount_value, discount_code, used, used_at, created_at). RLS: admin-only + service_role. Full GRANTs.

When a Pro upgrade is later claimed (out of scope to wire to Stripe checkout in this pass), the discount row is consumed by `used=true, used_at=now()`. We expose `claim_conversion_discount(_token)` RPC for the future Pro checkout flow to read remaining discount.

## 2. Edge functions

**Update `convert-demo-to-live`** — accept body:
```
{ demo_id, prospect_email, prospect_name, app_base_url,
  discount: { type, value },
  test_mode: boolean }
```
- Generates fresh `conversion_token` (UUID), `conversion_sent_at = now()`, `conversion_expires_at = now() + (test_mode ? 24h : 72h)`.
- Stores discount fields on the demo row + inserts a row into `demo_conversion_discounts`.
- Sets `conversion_status = test_mode ? 'test' : 'sent'`.
- Email subject/body includes the offer line (Free Pro / X% off / $Y off / standard pricing) and expiry timestamp. Test emails get a `🔬 TEST` banner and go to the admin's own email (resolved server-side via `auth.getUser()`).
- Idempotency: refuses if already `claimed`. Resend on `expired` / `sent` rotates token + extends window.

**Update `claim-real-demo-tournament`** (used by `/claim/:token` ClaimDemo page already wired to demo_tournaments via legacy `claim-converted-tournament`? — actually `ClaimDemo` reads `tournaments` table. We add a sibling function `claim-converted-tournament` already exists for the legacy flow OR create one). 

Concretely: ensure `/claim/:token` resolves against `demo_tournaments.conversion_token`, enforces:
- `conversion_expires_at > now()` else 410 "link expired"
- `conversion_status IN ('sent','test')` else 409 "already used"
- On success: `claimed_by=user.id, claimed_at=now(), conversion_status='claimed'` (atomic update gated on status). Test mode sets `test_converted_at` and `is_test_conversion=true` instead and does **not** transfer org / wipe mock data.

## 3. Admin UI

**`src/pages/admin/DemoConverter.tsx`** — replace the existing send action with a **Conversion Modal** (shadcn Dialog):
- Prospect email + name
- Offer radio group: None / Free Pro / Percentage (input) / Fixed $ (input)
- Live email preview (renders subject + body with offer line, expiry "72 hours from send")
- Buttons: `Send Signup Link` and `Send Test Email (to myself)`

Add **Sent Conversions** table beneath the demo grid, columns: Tournament · Prospect · Sent · Expires · Status badge · Actions (Resend / Copy Link). Status auto-derived: `expired` if `conversion_expires_at < now()` and not claimed.

## 4. Claim page

`src/pages/Claim.tsx` (existing for legacy demo_tournaments). Update to:
- Show expiry countdown and offer badge
- Show friendly error states for expired / already-claimed
- After successful claim, route to dashboard with toast incl. discount applied note

## 5. Files

**New**
- `supabase/migrations/<ts>_demo_conversion_72h.sql`
- (none — reuse Claim.tsx & DemoConverter.tsx)

**Edit**
- `supabase/functions/convert-demo-to-live/index.ts`
- `supabase/functions/claim-converted-tournament/index.ts` (or whichever ClaimDemo invokes — confirm during impl)
- `src/pages/admin/DemoConverter.tsx`
- `src/pages/Claim.tsx`
- `src/integrations/supabase/types.ts` auto-regens after migration

## Out of scope (call out)

- Wiring discount into Stripe Pro checkout pricing — needs a follow-up that reads `demo_conversion_discounts` from the upgrade-to-pro session. Stub RPC exposed now; checkout edit is a separate task.

Approve and I'll ship it.