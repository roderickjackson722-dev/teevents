# Proposal web isolation
- Client proposal webpages use separate capability-link documents and admin-only activity storage; never read or write events, billing or existing proposals; the only delivery is an admin-confirmed single-recipient link email that records send status on the document.
- Answers are deterministic extracts from the approved proposal content with section citations; unknown requests are saved for follow-up, not sent.
- Portal image slots map by label to approved screenshot asset pointers; unmatched labels stay named placeholders; reuse only the real founder portrait.
- The admin dashboard Proposals tab hosts this workspace; new client copies offer current software and quote-only management packages, while historical private copies keep their chosen packages and copies without a choice retain the historical catalog.
- Personalized Reason templates are editor-only starting points in `reasonTemplates`, inserted through the pure `withReason` helper; they never auto-fill, auto-send, or alter approved program terms.
