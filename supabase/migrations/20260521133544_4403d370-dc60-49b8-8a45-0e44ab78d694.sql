
-- Tournament budgets (1:1 with tournaments)
CREATE TABLE public.tournament_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL UNIQUE REFERENCES public.tournaments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage tournament_budgets"
ON public.tournament_budgets FOR ALL
USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND public.is_org_member(auth.uid(), t.organization_id)));

-- Estimates
CREATE TABLE public.budget_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.tournament_budgets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL DEFAULT '',
  vendor_contact TEXT NOT NULL DEFAULT '',
  estimated_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense','income')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage budget_estimates"
ON public.budget_estimates FOR ALL
USING (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)));

-- Expenses
CREATE TABLE public.budget_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.tournament_budgets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Venue','Staff','Equipment','Marketing','Travel','Food','Insurance','Prizes','Other')),
  estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_due_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage budget_expenses"
ON public.budget_expenses FOR ALL
USING (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE TRIGGER budget_expenses_updated_at BEFORE UPDATE ON public.budget_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Income
CREATE TABLE public.budget_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.tournament_budgets(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Registration','Sponsorship','Merchandise','Food & Beverage','Donation','Other')),
  projected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_received BOOLEAN NOT NULL DEFAULT false,
  date_received DATE,
  payer_source TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members manage budget_income"
ON public.budget_income FOR ALL
USING (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_budgets b JOIN public.tournaments t ON t.id = b.tournament_id WHERE b.id = budget_id AND public.is_org_member(auth.uid(), t.organization_id)));
CREATE TRIGGER budget_income_updated_at BEFORE UPDATE ON public.budget_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates (per user)
CREATE TABLE public.budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  tournament_format TEXT,
  expense_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  income_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget_templates"
ON public.budget_templates FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER tournament_budgets_updated_at BEFORE UPDATE ON public.tournament_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_budget_expenses_budget ON public.budget_expenses(budget_id);
CREATE INDEX idx_budget_income_budget ON public.budget_income(budget_id);
CREATE INDEX idx_budget_estimates_budget ON public.budget_estimates(budget_id);
