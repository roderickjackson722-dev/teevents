# src/pages

- `/sample-event` is a fully static sales showcase page (`src/pages/SampleEvent.tsx`) that mirrors the classic public tournament layout with hardcoded fictional content; its Register/Sponsor buttons only scroll to the bottom CTA and must never wire to checkout or live data.
- Sample Event visual styles and palette are scoped under `.sample-event-page` in its own stylesheet so showcase design changes cannot alter the shared navigation, footer, or real tournament pages.
- Public golf-course sales content stays presentation-only and must not replace the existing `/enterprise` workspace; its public address needs approval before registering navigation so customer dashboard links stay intact.
