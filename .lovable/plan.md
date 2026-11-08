# Editable client demos

## What you will get
- **Platform Tournaments → Demos** lists samples created through Create Tournament for Client, including existing samples, with their customer, date, status and tracking statistics.
- Each demo has **Open Dashboard**, **Preview**, **Copy Link** and **Convert** actions. Dashboard access is also available immediately after the flyer sample is built.
- **Open Dashboard** opens the normal event dashboard with the selected demo already loaded. Admins can save event details, branding and other event edits using the existing tools.
- **Preview** shows the saved demo event page, clearly labeled **Sample**, with its guided tour. The customer’s sample link continues to work.
- **Convert** provides an explicit client handoff from Demos. It preserves the edited event rather than building an unrelated replacement, and requires confirmation before assigning an organizer or sending anything.

## Safety and preservation
- Demos cannot take payments or accept public registrations, and stay out of public event listings until explicitly converted.
- Dashboard edits cannot remove these protections. Conversion leaves the event unpublished and registration closed; normal publishing remains a separate deliberate action.
- Creating or opening a demo never assigns the customer, creates a customer account, sends a welcome email or shares the link automatically.
- Preserve existing samples, view counts, conversion records, stats, legacy demos and Welcome Email Settings. Keep the existing tracking/settings inside Create Tournament for Client as well.
- Do not modify existing live tournaments, scoring, payments or grandfathered prices. Nothing is published or sent during verification.

## Technical implementation
- Link each flyer sample to an admin-controlled, protected draft tournament so the normal dashboard reads and saves its usual event data. Keep the original sample record as the customer link and tracking identity.
- Create this linked draft only after sample-build confirmation, or an admin’s explicit Open Dashboard action for an older sample. Do not automatically backfill existing events.
- Use authenticated, admin-authorized server functions for provisioning and conversion, with repeat-click protection and cleanup on failure.
- Enforce demo restrictions in persisted state and server/database checks, scoped to these linked client demos so unrelated legacy demo behavior stays unchanged. Inspect notification triggers before adding draft records.
- Reuse the existing dashboard organization/event context; do not use the sample-viewer sign-in, which disables saving and would replace the admin’s session.
- Have the sample preview resolve the linked draft’s saved presentation data without exposing admin notes or private customer information. Preserve the guided tour and payment-free sample actions.
- Reuse tracking and conversion controls rather than reintroducing the removed Demo Converter page.

## Verification
- Check the signed-in path: Demos → Open Dashboard → save a harmless edit on a temporary demo → Preview → confirm the edit persists.
- Check desktop and phone layouts and immediate dashboard access after building a temporary flyer sample.
- Verify original sample statistics and settings remain unchanged, and that demo registration, checkout and public-listing protections cannot be bypassed.
- Test conversion authorization and preservation without sending email or converting an existing customer sample; remove temporary verification data afterward.