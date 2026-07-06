
-- Phase 1: Per-tournament add-ons + manual entry quota
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS paid_features JSONB NOT NULL DEFAULT jsonb_build_object(
    'custom_domain', false,
    'unlimited_manual_entries', false,
    'auction_raffle', false,
    'sms_email_blasts', false,
    'priority_support', false,
    'bundle', false
  ),
  ADD COLUMN IF NOT EXISTS manual_entries_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_entries_free_limit INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS manual_entries_admin_override INTEGER NOT NULL DEFAULT 0;

-- Manual entry grants audit table
CREATE TABLE IF NOT EXISTS public.manual_entry_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  additional_entries INTEGER NOT NULL CHECK (additional_entries > 0),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.manual_entry_grants TO authenticated;
GRANT ALL ON public.manual_entry_grants TO service_role;

ALTER TABLE public.manual_entry_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view manual entry grants"
  ON public.manual_entry_grants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create manual entry grants"
  ON public.manual_entry_grants FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND granted_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_manual_entry_grants_tournament ON public.manual_entry_grants(tournament_id);
