
-- ============ Step A: QR Tokens ============
ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS qr_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS qr_token_expires_at TIMESTAMPTZ;

-- Backfill any nulls (DEFAULT only fires on new inserts for existing rows on some setups)
UPDATE public.tournament_registrations
SET qr_token = gen_random_uuid()
WHERE qr_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_qr_token
  ON public.tournament_registrations(qr_token);

-- Regenerate function (owners of the org that owns the tournament can call)
CREATE OR REPLACE FUNCTION public.regenerate_player_qr_token(_registration_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id UUID;
  _new_token UUID;
BEGIN
  SELECT t.organization_id INTO _org_id
  FROM public.tournament_registrations r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.id = _registration_id;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF NOT public.is_org_owner(auth.uid(), _org_id)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _new_token := gen_random_uuid();
  UPDATE public.tournament_registrations
  SET qr_token = _new_token,
      qr_token_expires_at = NULL
  WHERE id = _registration_id;

  RETURN _new_token;
END;
$$;

-- ============ Notification email — extra event types ============
ALTER TABLE public.notification_emails
  ADD COLUMN IF NOT EXISTS notify_sponsorship BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_vendor_registration BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_auction_win BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_refund_request BOOLEAN NOT NULL DEFAULT true;
