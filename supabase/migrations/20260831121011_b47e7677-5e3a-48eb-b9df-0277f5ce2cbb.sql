-- Public site reads (row-level policies still restrict to published/sample rows)
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT ON public.demo_tournaments TO anon;
GRANT SELECT ON public.demo_players TO anon;
GRANT SELECT ON public.sample_tournaments TO anon;

-- Signed-in access for tables whose policies already allow it
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sample_tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_auction_items TO authenticated;

GRANT ALL ON public.tournaments TO service_role;
GRANT ALL ON public.demo_tournaments TO service_role;
GRANT ALL ON public.demo_players TO service_role;
GRANT ALL ON public.sample_tournaments TO service_role;
GRANT ALL ON public.tournament_auction_items TO service_role;