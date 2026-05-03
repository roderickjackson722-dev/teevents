DO $$
DECLARE
  v_org_id uuid := 'bc97b525-9377-402d-9f9c-b6732c9ced55';
  v_prev_acct text;
BEGIN
  SELECT stripe_account_id INTO v_prev_acct FROM public.organizations WHERE id = v_org_id;

  UPDATE public.organizations SET stripe_account_id = NULL WHERE id = v_org_id;

  UPDATE public.organization_payout_methods
  SET stripe_account_id = NULL,
      stripe_onboarding_complete = false,
      stripe_account_status = 'pending',
      stripe_account_last4 = NULL,
      stripe_account_brand = NULL,
      stripe_bank_account_token = NULL,
      bank_name = NULL,
      account_last_four = NULL,
      routing_last_four = NULL,
      is_verified = false,
      preferred_method = NULL,
      pending_change_email = NULL,
      change_requested_at = NULL,
      change_request_status = 'none',
      verification_notes = NULL
  WHERE organization_id = v_org_id;

  UPDATE public.tournaments
  SET payment_method_override = 'default'
  WHERE organization_id = v_org_id AND payment_method_override = 'force_stripe';

  INSERT INTO public.stripe_onboarding_logs (organization_id, stripe_account_id, event_type, metadata)
  VALUES (v_org_id, v_prev_acct, 'admin_reset',
    jsonb_build_object('reason', 'Manual reset for fresh Stripe Connect test on Atlanta Golf Club Tournament', 'previous_account_id', v_prev_acct));
END $$;