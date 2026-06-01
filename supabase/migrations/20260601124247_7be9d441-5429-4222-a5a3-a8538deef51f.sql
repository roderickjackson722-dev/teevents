
CREATE TABLE public.admin_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT,
  customer_address TEXT,
  customer_company TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invoices TO authenticated;
GRANT ALL ON public.admin_invoices TO service_role;

ALTER TABLE public.admin_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invoices"
ON public.admin_invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invoices"
ON public.admin_invoices FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins can update invoices"
ON public.admin_invoices FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invoices"
ON public.admin_invoices FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_invoices_updated_at
BEFORE UPDATE ON public.admin_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_admin_invoices_status ON public.admin_invoices(status);
CREATE INDEX idx_admin_invoices_created_at ON public.admin_invoices(created_at DESC);
