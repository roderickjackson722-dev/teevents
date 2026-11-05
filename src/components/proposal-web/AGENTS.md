# Proposal web isolation
- Client proposal webpages use isolated capability-link documents and admin-only activity storage; admin Sent actions are status-only, and only an atomically claimed, Sent-gated client start choice sends the fixed-recipient notification with provider idempotency; never touch events, billing, or old proposal storage.
- Answers are deterministic extracts from the approved proposal content with section citations; unknown requests are saved for follow-up, not sent.
- Portal image slots map by label to approved screenshot asset pointers; unmatched labels stay named placeholders; reuse only the real founder portrait.
- The admin dashboard Proposals tab hosts this workspace; private management pricing lives in the validated document payload and uses a shared cents-based calculator, while public offers and historical copies without pricing retain their original content.
- Personalized Reason templates are editor-only starting points in `reasonTemplates`, inserted through the pure `withReason` helper; they never auto-fill, auto-send, or alter approved program terms.
