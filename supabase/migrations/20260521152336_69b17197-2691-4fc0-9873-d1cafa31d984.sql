DROP POLICY IF EXISTS "Org members manage tournament_budgets" ON public.tournament_budgets;
DROP POLICY IF EXISTS "Org members manage budget_estimates" ON public.budget_estimates;
DROP POLICY IF EXISTS "Org members manage budget_expenses" ON public.budget_expenses;
DROP POLICY IF EXISTS "Org members manage budget_income" ON public.budget_income;

CREATE POLICY "Org members and admins manage tournament_budgets"
ON public.tournament_budgets
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournaments t
    WHERE t.id = tournament_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members and admins manage budget_estimates"
ON public.budget_estimates
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members and admins manage budget_expenses"
ON public.budget_expenses
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY "Org members and admins manage budget_income"
ON public.budget_income
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.tournament_budgets b
    JOIN public.tournaments t ON t.id = b.tournament_id
    WHERE b.id = budget_id
      AND (
        public.is_org_member(auth.uid(), t.organization_id)
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);