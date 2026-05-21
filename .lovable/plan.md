## Budget Management Tool — Implementation Plan

This is a large build. Here's what I'll ship, in order, so you can stop me if anything's off before I touch the database.

### Scope decisions (please confirm)

1. **Existing Budget page** (`/dashboard/budget`) uses the old `tournament_budget_items` table. I'll **replace it** with the new tool (same route — keeps the sidebar link working). The new spec's route `/dashboard/tournaments/:id/budget` would require duplicating tournament selector logic; the current page already has a tournament dropdown which fits your dashboard pattern better. **Old data will not be migrated** (different schema, no estimates/actual/variance concept).
2. **Templates** stored per-user (as spec'd), reusable across tournaments in their org.
3. **PDF export** = browser print-to-PDF via print stylesheet (no extra deps). CSV export = single file with section headers (not multi-tab; true multi-tab requires .xlsx + a heavy lib).
4. **Auto-save** on blur with 500ms debounce + toast-free inline "Saved ✓" indicator.

### Phase 1 — Database (one migration)

New tables with RLS scoped to org members of the tournament:
- `tournament_budgets` (1:1 with tournament)
- `budget_estimates`
- `budget_expenses` (adds `category`, `actual_cost`, `payment_due_date`, `sort_order` vs old table)
- `budget_income` (adds `projected` vs `actual`, `payer_source`, `date_received`)
- `budget_templates` (user-owned, JSONB line items)

Helper: trigger to auto-create `tournament_budgets` row on first access (or lazy-create in code).

Defaults seeding (per-format expense/income lists from §3.1/§4.1) happens **client-side on first load** when the budget is empty, so format changes don't wipe edits.

### Phase 2 — UI components

New folder `src/components/dashboard/budget/`:
- `BudgetSummaryBar.tsx` — 4 metric cards (sticky on scroll)
- `EstimatesSection.tsx` — card grid, add/move-to/delete
- `ExpensesTable.tsx` — editable rows, variance, paid checkbox, sort
- `IncomeTable.tsx` — same pattern, received checkbox
- `ProfitLossCard.tsx` — colored border, progress bar, status badge
- `BudgetExportMenu.tsx` — print + CSV
- `TemplateDialog.tsx` — save/load templates
- `useBudgetAutosave.ts` — debounced upsert hook with "Saved" indicator
- `budgetDefaults.ts` — format-based default line items

### Phase 3 — Page rewrite

Rewrite `src/pages/dashboard/Budget.tsx` to orchestrate the above. Keep tournament selector at top. Mobile: tables collapse to cards below `md`.

### Phase 4 — Print styles

Add `@media print` block in `src/index.css` to hide sidebar/nav/buttons, expand notes, add header.

### Out of scope (not building unless you ask)

- True multi-sheet .xlsx export (would need `xlsx` npm dep)
- Migrating old `tournament_budget_items` data into new tables
- Real-time multi-user collaboration on the same budget

### Estimated changes

~10 new files, 1 migration, 1 page rewrite, ~1500 LOC. After your approval I'll run the migration first, then implement in one pass.

**Confirm and I'll start with the migration, or tell me which scope decisions to flip.**