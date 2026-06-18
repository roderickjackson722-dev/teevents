GRANT SELECT (winning_bidder_name, winner_notified_at) ON public.auctions TO anon;
GRANT SELECT (winner_name) ON public.tournament_auction_items TO anon;
GRANT SELECT (winner_ticket_number, winner_name) ON public.raffles TO anon;