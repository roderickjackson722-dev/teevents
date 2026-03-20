
-- Add feature overrides and fee override columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN feature_overrides jsonb DEFAULT NULL,
ADD COLUMN fee_override numeric DEFAULT NULL;

-- feature_overrides stores per-feature toggles like: {"donations": true, "store": true, "auction": false}
-- fee_override stores custom fee percentage like: 5 (for 5%) — NULL means use plan default
