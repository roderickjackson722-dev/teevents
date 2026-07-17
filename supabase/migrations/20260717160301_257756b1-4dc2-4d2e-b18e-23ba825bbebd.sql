ALTER TABLE public.league_access_purchases 
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS invoice_status text,
  ADD COLUMN IF NOT EXISTS invoice_notes text,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;

-- Allow admins to view and update all league access purchases (for invoicing dashboard)
DROP POLICY IF EXISTS "Admins manage league access purchases" ON public.league_access_purchases;
CREATE POLICY "Admins manage league access purchases"
  ON public.league_access_purchases
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));