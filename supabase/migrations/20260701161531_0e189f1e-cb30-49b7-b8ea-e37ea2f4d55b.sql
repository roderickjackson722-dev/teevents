UPDATE public.organization_payout_methods
SET stripe_onboarding_complete = true,
    stripe_account_status = 'active',
    is_verified = true,
    updated_at = now()
WHERE organization_id = '5f8d9b91-a49d-422c-b31f-b4aef7f28c4a'
  AND stripe_account_id = 'acct_1TjOB09MfdJsXH3y';