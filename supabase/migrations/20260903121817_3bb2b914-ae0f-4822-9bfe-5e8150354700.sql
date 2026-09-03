CREATE TABLE public.rfp_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  po_reference TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_to TEXT,
  payment_terms TEXT NOT NULL DEFAULT 'Net 30',
  notes TEXT,
  total_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_invoices TO authenticated;
GRANT ALL ON public.rfp_invoices TO service_role;
ALTER TABLE public.rfp_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp invoices" ON public.rfp_invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.rfp_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.rfp_invoices(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration TEXT NOT NULL DEFAULT '',
  rate_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfp_invoice_line_items TO authenticated;
GRANT ALL ON public.rfp_invoice_line_items TO service_role;
ALTER TABLE public.rfp_invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rfp invoice line items" ON public.rfp_invoice_line_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rfp_invoice_line_items_invoice ON public.rfp_invoice_line_items(invoice_id);

CREATE TRIGGER update_rfp_invoices_updated_at BEFORE UPDATE ON public.rfp_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfp_invoice_line_items_updated_at BEFORE UPDATE ON public.rfp_invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();