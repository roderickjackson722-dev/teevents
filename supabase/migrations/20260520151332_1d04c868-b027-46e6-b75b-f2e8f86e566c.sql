
CREATE TABLE public.outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  tournament_name TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  unsubscribed_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX outreach_leads_email_unique ON public.outreach_leads (lower(email));
CREATE INDEX outreach_leads_status_idx ON public.outreach_leads(status);

CREATE TABLE public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email1_subject TEXT,
  email1_body TEXT,
  email2_subject TEXT,
  email2_body TEXT,
  email3_subject TEXT,
  email3_body TEXT,
  delay_days INTEGER NOT NULL DEFAULT 2,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  email_number INTEGER NOT NULL CHECK (email_number BETWEEN 1 AND 3),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  click_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX outreach_queue_pending_idx ON public.outreach_queue(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX outreach_queue_lead_idx ON public.outreach_queue(lead_id);
CREATE INDEX outreach_queue_campaign_idx ON public.outreach_queue(campaign_id);

ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage outreach leads" ON public.outreach_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage outreach campaigns" ON public.outreach_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage outreach queue" ON public.outreach_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER outreach_leads_updated_at BEFORE UPDATE ON public.outreach_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER outreach_campaigns_updated_at BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default campaign
INSERT INTO public.outreach_campaigns (name, is_default, delay_days,
  email1_subject, email1_body,
  email2_subject, email2_body,
  email3_subject, email3_body)
VALUES (
  'Default Eventbrite Sequence', true, 2,
  'Does Eventbrite hold your golf tournament funds?',
  E'Hi {{first_name}},\n\nI noticed your golf tournament on Eventbrite.\n\nBuilt by golf tournament managers, for golf tournament managers – TeeVents was designed to solve the specific pain points you''re dealing with.\n\nQuick question: does Eventbrite hold your registration fees until after the event ends? Most organizers don''t realize they wait weeks to access their own money.\n\nSee how it works in 2 minutes (no call needed):\n👉 https://teevents.golf/interactive-demo\n\nYou''ll also get:\n• Live leaderboard (embed on your website)\n• Hole sponsor management & asset delivery\n• QR volunteer check-in\n• Lower fees than Eventbrite\n\n...and much more → https://teevents.golf/features\n\nIf it''s not a fit, no worries.\n\nBest,\nRod Jackson\nTeeVents Golf',
  'Eventbrite vs. TeeVents – what you''re missing',
  E'Hi {{first_name}},\n\nBuilt by golf tournament managers, for golf tournament managers – here''s what TeeVents offers that Eventbrite doesn''t:\n\n✅ Live leaderboard (embed on your website)\n✅ Hole sponsor management & asset delivery\n✅ Volunteer check-in with QR codes\n✅ Automatic payouts to your own Stripe account\n✅ Custom tournament website with your branding\n\n...and much more → https://teevents.golf/features\n\nSee the full comparison:\n👉 https://teevents.golf/compare/eventbrite-vs-teevents\n\nBest,\nRod',
  'See TeeVents in 5 minutes (no call)',
  E'Hi {{first_name}},\n\nBuilt by golf tournament managers, for golf tournament managers – we made TeeVents easy to start.\n\nWatch a 5-min demo:\n👉 https://teevents.golf/interactive-demo\n\nStart your free tournament in under 10 minutes:\n👉 https://teevents.golf/get-started\n\nNo call needed. No credit card required.\n\nBest,\nRod'
);
