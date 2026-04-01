
-- Update test tournament: set pass_fees_to_participants = false, and set end_date to 16 days ago for hold release testing
UPDATE tournaments 
SET pass_fees_to_participants = false,
    end_date = CURRENT_DATE - INTERVAL '16 days'
WHERE id = 'd7022b22-7995-40e7-bec1-88d384bb0f5e';

-- Update the latest test registration to paid
UPDATE tournament_registrations 
SET payment_status = 'paid'
WHERE id = '4f6e0c27-c329-415c-8db6-776320afa040';

-- Insert a simulated platform transaction (Model B: organizer absorbs 4%)
-- $100 registration, 4% fee = $4, hold = 15% of $100 = $15
INSERT INTO platform_transactions (
  organization_id, tournament_id, amount_cents, platform_fee_cents, 
  net_amount_cents, hold_amount_cents, hold_release_date, hold_status,
  type, status, description, stripe_session_id, metadata
) VALUES (
  'bc97b525-9377-402d-9f9c-b6732c9ced55',
  'd7022b22-7995-40e7-bec1-88d384bb0f5e',
  10000, -- $100 gross
  400,   -- $4 platform fee (4%)
  9600,  -- $96 net to organizer
  1500,  -- $15 hold (15% of gross)
  CURRENT_DATE - INTERVAL '1 day', -- hold release date already passed
  'active',
  'registration',
  'completed',
  'Test Golfer registration - Model B',
  'cs_test_simulated_001',
  '{"model": "B", "pass_fees_to_golfer": false, "registration_id": "4f6e0c27-c329-415c-8db6-776320afa040"}'::jsonb
);
