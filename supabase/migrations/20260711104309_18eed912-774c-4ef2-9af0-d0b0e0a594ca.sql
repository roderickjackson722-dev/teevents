
-- Tournament invoices (separate from existing admin_invoices)
CREATE TABLE public.tournament_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_org TEXT,
  client_email TEXT,
  client_phone TEXT,
  event_name TEXT NOT NULL,
  service_period_start DATE,
  service_period_end DATE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_terms TEXT DEFAULT '50% deposit upon receipt, balance due 10 days before event',
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_invoices TO authenticated;
GRANT ALL ON public.tournament_invoices TO service_role;
ALTER TABLE public.tournament_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tournament invoices"
  ON public.tournament_invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_tournament_invoices_updated
  BEFORE UPDATE ON public.tournament_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tournament_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.tournament_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER GENERATED ALWAYS AS (quantity * unit_price_cents) STORED,
  display_order INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_invoice_line_items TO authenticated;
GRANT ALL ON public.tournament_invoice_line_items TO service_role;
ALTER TABLE public.tournament_invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice line items"
  ON public.tournament_invoice_line_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.tournament_invoice_service_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.tournament_invoices(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_invoice_service_breakdowns TO authenticated;
GRANT ALL ON public.tournament_invoice_service_breakdowns TO service_role;
ALTER TABLE public.tournament_invoice_service_breakdowns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice breakdowns"
  ON public.tournament_invoice_service_breakdowns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.tournament_invoice_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.tournament_invoices(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  payee_amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_details TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_invoice_payment_allocations TO authenticated;
GRANT ALL ON public.tournament_invoice_payment_allocations TO service_role;
ALTER TABLE public.tournament_invoice_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invoice payment allocations"
  ON public.tournament_invoice_payment_allocations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate invoice number: INV-YYYY-### (per-year sequence)
CREATE OR REPLACE FUNCTION public.generate_tournament_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr TEXT;
  next_seq INT;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
    RETURN NEW;
  END IF;
  yr := to_char(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '^INV-' || yr || '-', ''), '')::int), 0) + 1
    INTO next_seq
    FROM public.tournament_invoices
    WHERE invoice_number LIKE 'INV-' || yr || '-%';
  NEW.invoice_number := 'INV-' || yr || '-' || lpad(next_seq::text, 3, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tournament_invoice_number
  BEFORE INSERT ON public.tournament_invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_tournament_invoice_number();
