
-- Update category constraints to match new template-style sections
ALTER TABLE public.budget_expenses DROP CONSTRAINT IF EXISTS budget_expenses_category_check;
ALTER TABLE public.budget_expenses ALTER COLUMN category SET DEFAULT 'Misc';
UPDATE public.budget_expenses SET category = CASE
  WHEN category IN ('Venue') THEN 'Facility'
  WHEN category IN ('Marketing') THEN 'Publicity'
  WHEN category IN ('Food') THEN 'Food & Beverage'
  WHEN category IN ('Prizes') THEN 'Player Gifts & Prizes'
  WHEN category IN ('Staff','Equipment','Travel','Insurance','Other') THEN 'Misc'
  ELSE 'Misc' END
WHERE category NOT IN ('Facility','Signage','Food & Beverage','Publicity','Player Gifts & Prizes','Misc');
ALTER TABLE public.budget_expenses ADD CONSTRAINT budget_expenses_category_check
  CHECK (category IN ('Facility','Signage','Food & Beverage','Publicity','Player Gifts & Prizes','Misc'));

ALTER TABLE public.budget_income DROP CONSTRAINT IF EXISTS budget_income_category_check;
ALTER TABLE public.budget_income ALTER COLUMN category SET DEFAULT 'Misc Income';
UPDATE public.budget_income SET category = CASE
  WHEN category IN ('Registration') THEN 'Registrations'
  WHEN category IN ('Sponsorship') THEN 'Sponsorships'
  WHEN category IN ('Merchandise','Food & Beverage','Other') THEN 'Add-ons & Extras'
  WHEN category IN ('Donation') THEN 'Donations'
  ELSE 'Misc Income' END
WHERE category NOT IN ('Registrations','Sponsorships','Add-ons & Extras','Donations','Misc Income');
ALTER TABLE public.budget_income ADD CONSTRAINT budget_income_category_check
  CHECK (category IN ('Registrations','Sponsorships','Add-ons & Extras','Donations','Misc Income'));

-- Vendor comparison columns for estimates (replaces single vendor_contact / estimated_amount usage)
ALTER TABLE public.budget_estimates
  ADD COLUMN IF NOT EXISTS vendor_a_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vendor_a_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_b_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vendor_b_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_c_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vendor_c_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sponsorable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Golfer counts on the budget itself (for cost-per-person KPI in expense header)
ALTER TABLE public.tournament_budgets
  ADD COLUMN IF NOT EXISTS estimated_golfers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_golfers INTEGER NOT NULL DEFAULT 0;

-- Vendor estimate "price" (used for income variants of estimates) — keep estimated_amount for income type
-- (no change needed; existing estimated_amount works)
