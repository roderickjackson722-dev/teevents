REVOKE SELECT (winning_bidder_email) ON public.auctions FROM anon;

REVOKE SELECT (winner_email) ON public.raffles FROM anon;

REVOKE SELECT ON public.tournament_donations FROM anon;
GRANT SELECT (id, tournament_id, amount_cents, status, created_at)
  ON public.tournament_donations TO anon;

REVOKE SELECT ON public.team_promoters FROM anon;
GRANT SELECT (id, tournament_id, unique_ref_code, is_active, created_at)
  ON public.team_promoters TO anon;