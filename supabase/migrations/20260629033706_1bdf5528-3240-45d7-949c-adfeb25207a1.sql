REVOKE SELECT (contact_email, contact_phone, contact_name) ON public.sponsor_registrations FROM anon;
REVOKE SELECT (contact_email, contact_phone, contact_name) ON public.vendor_registrations FROM anon;
REVOKE SELECT (donor_name, notes) ON public.tournament_offline_donations FROM anon;
