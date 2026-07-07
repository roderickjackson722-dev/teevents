
-- Add fee payment method + settlement tracking
ALTER TABLE public.manual_entry_fees
  ADD COLUMN IF NOT EXISTS fee_payment_method text NOT NULL DEFAULT 'deduct',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_charge_id text;

ALTER TABLE public.manual_entry_fees
  DROP CONSTRAINT IF EXISTS manual_entry_fees_payment_method_check;
ALTER TABLE public.manual_entry_fees
  ADD CONSTRAINT manual_entry_fees_payment_method_check
  CHECK (fee_payment_method IN ('deduct','instant'));

ALTER TABLE public.platform_transactions
  ADD COLUMN IF NOT EXISTS manual_entry_fee_liability boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_entry_fee_amount_cents integer,
  ADD COLUMN IF NOT EXISTS manual_entry_fee_settled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_entry_fee_settled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_platform_transactions_liability_open
  ON public.platform_transactions(organization_id)
  WHERE manual_entry_fee_liability = true AND manual_entry_fee_settled = false;

-- Update record_manual_entry to accept a payment method
CREATE OR REPLACE FUNCTION public.record_manual_entry(
  _tournament_id uuid,
  _entity_type text,
  _entity_id uuid,
  _amount_cents integer,
  _confirm_fee boolean,
  _payment_method text DEFAULT 'deduct'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t RECORD;
  effective_limit integer;
  new_used integer;
  fee_cents integer := 0;
  over_quota boolean := false;
  tx_id uuid;
  fee_id uuid;
  unlimited boolean := false;
  method text := COALESCE(_payment_method, 'deduct');
BEGIN
  IF method NOT IN ('deduct','instant') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

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
       stripe_fee_cents, net_amount_cents, type, status, description, metadata,
       manual_entry_fee_liability, manual_entry_fee_amount_cents,
       manual_entry_fee_settled)
    VALUES
      (t.organization_id, t.id, COALESCE(_amount_cents,0), fee_cents,
       0, COALESCE(_amount_cents,0) - fee_cents, 'manual_entry_fee',
       CASE WHEN method = 'instant' THEN 'pending' ELSE 'pending' END,
       'Manual entry fee (5%) — ' || CASE WHEN method='instant' THEN 'instant charge' ELSE 'deducted from next payout' END,
       jsonb_build_object('entity_type', _entity_type, 'entity_id', _entity_id, 'payment_method', method),
       (method = 'deduct'), fee_cents, false)
    RETURNING id INTO tx_id;

    INSERT INTO public.manual_entry_fees
      (tournament_id, entity_type, entity_id, amount_cents, fee_cents,
       paid, platform_transaction_id, created_by, fee_payment_method)
    VALUES
      (t.id, _entity_type, _entity_id, COALESCE(_amount_cents,0), fee_cents,
       false, tx_id, auth.uid(), method)
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
    'fee_id', fee_id,
    'transaction_id', tx_id,
    'payment_method', method
  );
END;
$function$;

-- Settle outstanding manual-entry-fee liabilities against a payout amount.
-- Returns the total cents deducted. Callable by service_role only.
CREATE OR REPLACE FUNCTION public.settle_manual_entry_liabilities(
  _organization_id uuid,
  _max_deduct_cents integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  remaining integer := GREATEST(0, COALESCE(_max_deduct_cents, 0));
  total_deducted integer := 0;
  liab RECORD;
BEGIN
  IF remaining <= 0 THEN RETURN 0; END IF;
  FOR liab IN
    SELECT id, manual_entry_fee_amount_cents
    FROM public.platform_transactions
    WHERE organization_id = _organization_id
      AND manual_entry_fee_liability = true
      AND manual_entry_fee_settled = false
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN remaining <= 0;
    IF liab.manual_entry_fee_amount_cents <= remaining THEN
      UPDATE public.platform_transactions
        SET manual_entry_fee_settled = true,
            manual_entry_fee_settled_at = now(),
            status = 'settled'
        WHERE id = liab.id;
      UPDATE public.manual_entry_fees
        SET paid = true, paid_at = now()
        WHERE platform_transaction_id = liab.id;
      remaining := remaining - liab.manual_entry_fee_amount_cents;
      total_deducted := total_deducted + liab.manual_entry_fee_amount_cents;
    END IF;
  END LOOP;
  RETURN total_deducted;
END;
$function$;
