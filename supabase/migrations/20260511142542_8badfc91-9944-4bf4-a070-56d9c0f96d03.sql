CREATE TABLE public.sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  tournament_name TEXT,
  organizer_name TEXT,
  event_date DATE,
  location TEXT,
  contact_email TEXT,
  contact_social_handle TEXT,
  extracted_data JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  generated_message TEXT,
  message_sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  demo_booked_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sales leads"
ON public.sales_leads FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sales_leads_updated_at
BEFORE UPDATE ON public.sales_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sales_leads_status ON public.sales_leads(status);
CREATE INDEX idx_sales_leads_created ON public.sales_leads(created_at DESC);