
CREATE TABLE IF NOT EXISTS public.manual_entry_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('player','sponsor','side_event','vendor','donation')),
  entity_id uuid,
  amount_cents integer NOT NULL DEFAULT 0,
  fee_cents integer NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  platform_transaction_id uuid REFERENCES public.platform_transactions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_manual_entry_fees_tournament ON public.manual_entry_fees(tournament_id);

GRANT SELECT, INSERT ON public.manual_entry_fees TO authenticated;
GRANT ALL ON public.manual_entry_fees TO service_role;

ALTER TABLE public.manual_entry_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view manual entry fees" ON public.manual_entry_fees;
CREATE POLICY "Org members can view manual entry fees" ON public.manual_entry_fees
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = manual_entry_fees.tournament_id
      AND public.is_org_member(auth.uid(), t.organization_id)
  ) OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can insert manual entry fees" ON public.manual_entry_fees;
CREATE POLICY "Admins can insert manual entry fees" ON public.manual_entry_fees
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.record_manual_entry(
  _tournament_id uuid,
  _entity_type text,
  _entity_id uuid,
  _amount_cents integer,
  _confirm_fee boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  effective_limit integer;
  new_used integer;
  fee_cents integer := 0;
  over_quota boolean := false;
  tx_id uuid;
  fee_id uuid;
  unlimited boolean := false;
BEGIN
  SELECT id, organization_id,
         COALESCE(manual_entries_used,0) AS used,
         COALESCE(manual_entries_free_limit,10) AS free_limit,
         COALESCE(manual_entries_admin_override,0) AS override,
         COALESCE(paid_features, '{}'::jsonb) AS paid_features
    INTO t
  FROM public.tournaments WHERE id = _tournament_id FOR UPDATE;

  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;

  IF NOT (public.is_org_member(auth.uid(), t.organization_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  unlimited := COALESCE((t.paid_features->>'unlimited_manual_entries')::boolean, false)
            OR COALESCE((t.paid_features->>'bundle')::boolean, false);

  effective_limit := t.free_limit + t.override;
  new_used := t.used + 1;
  over_quota := (NOT unlimited) AND (new_used > effective_limit);

  IF over_quota THEN
    fee_cents := GREATEST(0, ROUND(COALESCE(_amount_cents,0) * 0.05)::integer);
    IF NOT _confirm_fee THEN
      RETURN jsonb_build_object(
        'over_quota', true,
        'confirmed', false,
        'used', t.used,
        'limit', effective_limit,
        'fee_cents', fee_cents
      );
    END IF;
    INSERT INTO public.platform_transactions
      (organization_id, tournament_id, amount_cents, platform_fee_cents,
       stripe_fee_cents, net_amount_cents, type, status, description, metadata)
    VALUES
      (t.organization_id, t.id, COALESCE(_amount_cents,0), fee_cents,
       0, COALESCE(_amount_cents,0) - fee_cents, 'manual_entry_fee', 'pending',
       'Manual entry fee (5%) — over free quota',
       jsonb_build_object('entity_type', _entity_type, 'entity_id', _entity_id))
    RETURNING id INTO tx_id;

    INSERT INTO public.manual_entry_fees
      (tournament_id, entity_type, entity_id, amount_cents, fee_cents,
       paid, platform_transaction_id, created_by)
    VALUES
      (t.id, _entity_type, _entity_id, COALESCE(_amount_cents,0), fee_cents,
       false, tx_id, auth.uid())
    RETURNING id INTO fee_id;
  END IF;

  UPDATE public.tournaments
    SET manual_entries_used = new_used
    WHERE id = t.id;

  RETURN jsonb_build_object(
    'over_quota', over_quota,
    'confirmed', true,
    'used', new_used,
    'limit', effective_limit,
    'fee_cents', fee_cents,
    'fee_id', fee_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_manual_entry(uuid, text, uuid, integer, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_manual_entries(
  _tournament_id uuid,
  _additional integer,
  _reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _additional IS NULL OR _additional < 1 THEN
    RAISE EXCEPTION 'additional must be >= 1';
  END IF;
  INSERT INTO public.manual_entry_grants (tournament_id, granted_by, additional_entries, reason)
  VALUES (_tournament_id, auth.uid(), _additional, _reason);
  UPDATE public.tournaments
    SET manual_entries_admin_override = COALESCE(manual_entries_admin_override,0) + _additional
    WHERE id = _tournament_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_manual_entries(uuid, integer, text) TO authenticated;
