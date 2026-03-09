
ALTER TABLE public.organizations
  ADD COLUMN is_nonprofit boolean NOT NULL DEFAULT false,
  ADD COLUMN ein text DEFAULT NULL,
  ADD COLUMN nonprofit_name text DEFAULT NULL,
  ADD COLUMN nonprofit_verified boolean NOT NULL DEFAULT false;
