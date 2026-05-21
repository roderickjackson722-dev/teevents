ALTER TABLE public.tournament_budgets
  ADD COLUMN IF NOT EXISTS estimate_section_title TEXT NOT NULL DEFAULT 'Vendor Estimates',
  ADD COLUMN IF NOT EXISTS expense_section_titles JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS income_section_titles JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pnl_section_title TEXT NOT NULL DEFAULT 'Profit / Loss Summary';