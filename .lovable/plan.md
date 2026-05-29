## Goal
Consolidate admin dashboard navigation by adding a new top-level **Sales** category (separate from TeeVents Operations) that houses outreach/demo tools. Add a Send-to-Prospect modal on every email template in Mockup Outreach, a downloadable PDF demo agenda, and log every send to a new `outreach_logs` table.

## 1. Sidebar reorganization (`src/pages/AdminDashboard.tsx`)

New **Sales** category containing:
- **Demo** — combines `AdminDemoScript` (existing 15-min script for admin) + new **Download Demo Agenda PDF** button (for prospects). Same order as the script so admin can follow along.
- **Outreach** — current `AdminEmailScripts` email-sequence tool, with a new **"Send to Prospect"** button on each template.
- **Mockup Outreach** — current `SampleGenerator` (moved here from its own tab).

Removed from the old **Outreach / Sales Hub** tab:
- Prospect Tracker (`AdminProspects`)
- Prospecting Stats (`AdminProspectStats`)
- The hub itself goes away; `AdminSalesHub` wrapper is no longer rendered.

Moved into **TeeVents Operations** category:
- **Sales Prospecting Tool** link (currently a top-level button) becomes a normal sidebar item under TeeVents Operations.

No other tabs are touched.

## 2. Send-to-Prospect modal (new `src/components/admin/SendProspectEmailModal.tsx`)

Triggered from each template card in `AdminEmailScripts` and each sample card in `SampleGenerator` via a **Send** button. Modal fields:
- Prospect Email (required)
- Prospect Name (optional, merges into `{name}` / `[Tournament Name]` tokens)
- Editable subject + body pre-filled from the selected template (with the exact copy from the user's spec for the initial outreach email)
- Buttons: **Send via Email**, **Copy to Clipboard**, **Cancel**

On Send: calls existing `send-mockup-outreach` edge function (already used by `SendProspectModal`) and inserts a row into `outreach_logs` with `email_type: 'initial'` or `'followup'`.

A second template option in the modal is the **Follow-up** copy ("Great – here's your free example…") so I can send it once they reply yes. The sample link is auto-inserted from the selected/most recent sample.

## 3. Demo Agenda PDF (`src/pages/sales/DemoAgenda.tsx` already exists as web page)

Add a **Download PDF** button on the new Demo subtab that opens `/sales/demo-agenda?print=1` and uses `window.print()` with print CSS, producing a clean one-page agenda branded TeeVents (gold + forest green). Content mirrors the 15-min script sections so prospects can follow along.

No new PDF library — uses the existing print-to-PDF pattern already used elsewhere in the app (e.g. `SalesFlyer`, `CompareEventbritePdf`).

## 4. Database — `outreach_logs` table (migration)

```
outreach_logs(
  id uuid pk default gen_random_uuid(),
  sample_id uuid null references prospect_samples(id) on delete set null,
  prospect_email text not null,
  prospect_name text,
  email_type text not null check (email_type in ('initial','followup','custom')),
  subject text,
  template_key text,
  sent_by uuid references auth.users(id),
  sent_at timestamptz not null default now()
)
```
- GRANTs to `authenticated` + `service_role` (no anon).
- RLS: only `admin` role can select/insert (uses existing `has_role(auth.uid(),'admin')`).

If `prospect_samples` table doesn't exist in the current schema, the FK is dropped and `sample_id` stays as a plain uuid column.

## 5. Files touched

- `src/pages/AdminDashboard.tsx` — sidebar groups, tab type union, tab rendering
- `src/components/admin/AdminEmailScripts.tsx` — add **Send to Prospect** button per template
- `src/components/admin/SampleGenerator.tsx` — add **Send** button next to existing actions per sample
- `src/components/admin/SendProspectEmailModal.tsx` — **new** unified modal (supersedes/extends `SendProspectModal.tsx`)
- `src/pages/sales/DemoAgenda.tsx` — add **Download PDF** button + print CSS
- New Supabase migration creating `outreach_logs`

## What is NOT changing
Organizer-facing dashboard, public site, payments, all unrelated admin tabs.

---

Approve and I'll implement in this order: migration → sidebar restructure → modal component → wire-up in EmailScripts/SampleGenerator → PDF button on DemoAgenda.