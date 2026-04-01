
-- Add hold tracking columns to platform_transactions
ALTER TABLE public.platform_transactions 
  ADD COLUMN IF NOT EXISTS hold_amount_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hold_release_date date,
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'active';

-- Create hold_releases table to track when holds are released
CREATE TABLE IF NOT EXISTS public.hold_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.platform_transactions(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  amount_cents integer NOT NULL,
  released_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hold_releases ENABLE ROW LEVEL SECURITY;

-- Admins can manage all hold releases
CREATE POLICY "Admins can manage hold releases"
  ON public.hold_releases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Org members can view their own hold releases
CREATE POLICY "Org members can view own hold releases"
  ON public.hold_releases FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
