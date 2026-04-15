
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.org_invitations ADD COLUMN IF NOT EXISTS name text;
