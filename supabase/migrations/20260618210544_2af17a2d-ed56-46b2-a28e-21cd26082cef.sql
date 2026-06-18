REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (id, tournament_id, item_name, description, images, starting_bid_cents, current_bid_cents, minimum_increment_cents, buy_now_cents, start_time, end_time, auto_extend_minutes, status, winning_bid_amount_cents, created_at, updated_at) ON public.auctions TO anon;

REVOKE SELECT ON public.raffles FROM anon;
GRANT SELECT (id, tournament_id, item_name, description, images, ticket_price_cents, max_tickets, tickets_sold, draw_time, winner_notified_at, status, created_at, updated_at) ON public.raffles TO anon;

REVOKE SELECT ON public.sponsor_registrations FROM anon;
GRANT SELECT (id, tournament_id, tier_id, company_name, website_url, description, logo_url, amount_cents, payment_status, paid_at, created_at, show_on_public, manually_approved, is_title_sponsor) ON public.sponsor_registrations TO anon;

REVOKE SELECT ON public.team_promoters FROM anon;
GRANT SELECT (id, tournament_id, name, role, unique_ref_code, is_active, created_at, updated_at) ON public.team_promoters TO anon;

REVOKE SELECT ON public.tournament_auction_items FROM anon;
GRANT SELECT (id, tournament_id, title, description, image_url, type, starting_bid, current_bid, buy_now_price, raffle_ticket_price, is_active, sort_order, created_at) ON public.tournament_auction_items TO anon;

REVOKE SELECT ON public.tournament_donations FROM anon;
GRANT SELECT (id, tournament_id, amount_cents, status, created_at) ON public.tournament_donations TO anon;

REVOKE SELECT ON public.vendor_registrations FROM anon;
GRANT SELECT (id, tournament_id, vendor_name, business_type, booth_location, booth_fee_cents, payment_status, status, checked_in, checked_in_at, paid_at, created_at, updated_at, tier_id, company_name, logo_url, amount_cents, website_url, description, show_on_public, manually_approved) ON public.vendor_registrations TO anon;