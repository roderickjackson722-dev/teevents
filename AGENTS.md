# Project Architecture Rules

- Enterprise workspace navigation is owned by `EnterpriseLayout`; keep its sidebar groups and role filtering shared across every Enterprise page so navigation and permissions stay consistent.
- Enterprise tournaments remain ordinary `tournaments` rows with `is_enterprise=true`; keep scoring, registration, publishing, and payments on the existing shared tournament plumbing.