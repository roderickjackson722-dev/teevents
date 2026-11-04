# Proposal web isolation
- Client proposal webpages use separate capability-link documents and admin-only activity storage; never read or write events, billing or existing proposals.
- Answers are deterministic extracts from the approved proposal content with section citations; unknown requests are saved for follow-up, not sent.
- Portal image slots map by label to approved screenshot asset pointers; unmatched labels stay named placeholders; reuse only the real founder portrait.
- The admin dashboard Proposals tab hosts this workspace; each client copy stores its chosen packages, and copies without a choice show all six.
- Personalized Reason templates are editor-only starting points in `reasonTemplates`, inserted through the pure `withReason` helper; they never auto-fill, auto-send, or alter approved program terms.
