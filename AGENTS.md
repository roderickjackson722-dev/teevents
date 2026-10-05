# Project Architecture Rules

- Enterprise workspace navigation is owned by `EnterpriseLayout`; keep its sidebar groups and role filtering shared across every Enterprise page so navigation and permissions stay consistent.
- Enterprise tournaments remain ordinary `tournaments` rows with `is_enterprise=true`; keep scoring, registration, publishing, and payments on the existing shared tournament plumbing.
- Handicap math lives only in `src/lib/courseHandicap.ts` (USGA formula, 9-hole halving, allowance); GHIN calls live only in `src/lib/ghin.server.ts` behind `/api/ghin/*` routes — one source of truth so client display and server sync always agree.
- Pricing behavior is cohort-based: existing events and leagues remain `legacy`; only explicit post-cutover creation paths stamp the current pricing version, so edits never migrate grandfathered records.
- College survey presentation and response-copy settings live on each `college_surveys` row so every survey can be configured independently.
