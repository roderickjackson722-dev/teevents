# Receipt email template

Add a new "Payment Receipt" option to the Email Templates dropdown so organizers can send an itemized receipt for a registration, an add-on purchase, or a sponsorship — fully editable, auto-filled with the real amounts, and downloadable/copyable for use outside the platform.

## What the organizer gets

**In the template dropdown** (next to Player Confirmation, Sponsor Confirmation, etc.):
- New entry: **Payment Receipt**

**A second dropdown for the receipt type:**
- Registration
- Add-On / Extras
- Sponsorship

Each type keeps its own saved wording, so the sponsorship receipt can read differently from the registration receipt. All the normal editing tools apply: subject, greeting, body, closing, footer, colors, logo, fonts, header title.

**Auto-filled amounts.** Picking a payment from the event's transaction list fills in the itemized block automatically:
- Item / description
- Amount paid
- Processing & credit card fee
- Service fee
- Total charged
- Payment date, receipt number, last 4 / payment reference when available

These are also available as insertable tags (`{{receipt_total}}`, `{{processing_fee}}`, etc.) so organizers can place them anywhere in their own wording.

**Who it goes to.** Either pick someone from the event's registrant list (search included) or type any email address — useful for sponsors, vendors, or a finance contact who never registered.

**Use it outside the platform.** Three buttons: **Copy as text** (paste into Gmail/Outlook), **Copy HTML**, and **Download** (saves the receipt as a file that opens in any browser and prints to PDF).

## Technical notes

- Migration: add `receipt_email_config jsonb` to `tournaments`; the three receipt types are stored as keyed sections inside that one column, saved through the existing save path.
- `src/pages/dashboard/EmailTemplateEditor.tsx`: new `receipt` TemplateKind (label, header, CONFIG_KEY, default config), dropdown item, banner copy, receipt variable tags, added to the tournaments select list. The bulk player-send block is skipped for this kind; the Send tab renders the new component instead.
- New `src/components/dashboard/ReceiptEmailSender.tsx`: receipt-type select, transaction picker reading `platform_transactions` (`amount_cents`, `platform_fee_cents`, `stripe_fee_cents`, `net_amount_cents`, `type`, `description`, `golfer_name/email`, `created_at`) filtered to the selected event and receipt type, manual-amount override fields, recipient picker (registrant list or free-text email), live preview using the editor's `renderEmailHtml`, and copy/download/send actions.
- New edge function `supabase/functions/send-receipt-email/index.ts`, modelled on `send-sponsor-day-of-email`: auth via bearer token, authorized by `has_role('admin')` or `is_org_member`, sends the rendered HTML through Resend from `info@notifications.teevents.golf`.
- Receipt totals are read-only derivations of existing transaction rows; nothing about payments, fees, or Stripe behaviour changes.
