# Plan

Four independent changes, ordered from lowest to highest risk.

---

## 1. Player Hub tile simplification (low risk, frontend only)

Replace the "Schedule & Details" and "Photo Gallery" tiles on `/hub/:slug/:token` with a single **"View Tournament Website"** tile linking to `/t/:slug`. "Live Scoring", "Live Leaderboard", and "Contact Organizer" tiles stay unchanged.

Files: `src/pages/PlayerHub.tsx` only.

---

## 2. Admin menu reorganization (low risk, no functional change)

Move the "Platform Tournaments Detailed" link from **TeeVents Operations** into **Platform Management**, directly under the existing "Platform Tournaments" link. Both routes, both pages, and both underlying queries stay **byte-identical** — only the sidebar grouping changes. Huntsville Bible College and ATL Golf Championships continue to render through the same code paths.

Files: whichever admin sidebar/menu config file defines those two sections (I'll locate and edit only the menu entry).

---

## 3. Registration confirmation email — organizer logo (medium risk)

Add the organizer's tournament logo (falls back to org logo, then TeeVents logo) to the header block of the default registrant confirmation email. Uses existing `tournaments.logo_url` / `organizations.logo_url` — no new columns.

Files: `supabase/functions/_shared/notify.ts` (or the equivalent template builder used by `sendRegistrantConfirmationEmail`) + redeploy affected functions.

---

## 4. Organizer-controlled Confirmation Email editor (largest piece)

**Location:** Tournament Setup → new **"Confirmation Emails"** tab.

**Audiences the organizer can independently edit:**
- Player / Registrant confirmation
- Sponsor confirmation
- Vendor confirmation
- Plus an **"Apply to all"** action that copies one template's design to the other two

**Editor capabilities:**
- Rich-text body (bold, italic, underline, lists, links, headings) via a lightweight Tiptap editor
- Font family picker (curated safe list: Inter, Arial, Georgia, Times, Helvetica, Roboto)
- Header color, button color, text color pickers
- Upload an image/logo shown at the top of the email (Supabase Storage bucket `email-assets`)
- Merge tags: `{{first_name}}`, `{{last_name}}`, `{{event_name}}`, `{{event_date}}`, `{{event_location}}`, `{{organizer_name}}`
- Live preview panel rendering the email with sample data
- "Send test email to me" button
- "Reset to default" per audience

**Data model** — one new table `tournament_email_templates`:
```
tournament_id (fk), audience ('player'|'sponsor'|'vendor'),
subject, header_image_url, header_bg_color, button_color,
text_color, font_family, greeting, body_html, closing_text,
footer_text, enabled (bool), updated_at
```
Unique on `(tournament_id, audience)`. RLS: org members read/write their org's rows; service role full. GRANTs to `authenticated` + `service_role`.

**Send-time behavior:** existing send functions (`resend-confirmation`, and the automatic post-registration / post-sponsor / post-vendor confirmation triggers) check for a matching enabled template row for the tournament + audience. If present, render with it; otherwise fall back to today's default template (unchanged behavior for tournaments that never open the editor — **Huntsville and ATL are unaffected until the organizer opts in**).

**Files created:**
- `src/pages/dashboard/ConfirmationEmails.tsx` (new tab page)
- `src/components/dashboard/email-editor/*` (editor, preview, image upload, audience switcher)
- `supabase/functions/send-confirmation-test/index.ts` (test-send)
- Migration for `tournament_email_templates` + storage bucket `email-assets`

**Files edited:**
- `src/App.tsx` (route)
- `src/components/DashboardSidebar.tsx` or Tournament Setup nav (add tab)
- `supabase/functions/_shared/notify.ts` (template resolver + logo)
- `supabase/functions/resend-confirmation/index.ts` (already reads `confirmation_email_config`; extend to read the new per-audience table)
- Any sponsor/vendor confirmation senders

---

## Order of execution

1. Ship #1 and #2 first (fast, zero-risk visual/organizational wins).
2. Ship #3 (logo in existing default template).
3. Ship #4 in one pass — migration → editor UI → send-time integration → deploy edge functions → verify against a test tournament (NOT Huntsville / ATL).

Nothing on Huntsville Bible College or ATL Golf Championships changes unless their organizer explicitly opens the new editor and saves a template.
