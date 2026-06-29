REVOKE SELECT (donor_email) ON public.tournament_donations FROM anon;
REVOKE SELECT (email, name) ON public.team_promoters FROM anon;
REVOKE SELECT (contact_email, contact_phone) ON public.sponsor_registrations FROM anon;
REVOKE SELECT (contact_email, contact_phone) ON public.vendor_registrations FROM anon;