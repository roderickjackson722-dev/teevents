CREATE TABLE public.tournament_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  name TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tournament_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_roles TO authenticated;
GRANT ALL ON public.tournament_roles TO service_role;
ALTER TABLE public.tournament_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tournament_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  name TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tournament_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_invitations TO authenticated;
GRANT ALL ON public.tournament_invitations TO service_role;
ALTER TABLE public.tournament_invitations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.temp_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.temp_passwords TO service_role;
ALTER TABLE public.temp_passwords ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_tournament_role(_user_id UUID, _tournament_id UUID, _roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tournament_roles tr
    WHERE tr.tournament_id = _tournament_id
      AND tr.user_id = _user_id
      AND tr.is_active = TRUE
      AND (_roles IS NULL OR tr.role = ANY(_roles))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_tournament_team(_user_id UUID, _tournament_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = _tournament_id
        AND public.is_org_admin_or_owner(_user_id, t.organization_id)
    )
    OR public.has_tournament_role(_user_id, _tournament_id, ARRAY['organizer','admin'])
$$;

-- tournament_roles policies
CREATE POLICY "Users can view their own tournament roles"
ON public.tournament_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can add tournament roles"
ON public.tournament_roles FOR INSERT TO authenticated
WITH CHECK (public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can update tournament roles"
ON public.tournament_roles FOR UPDATE TO authenticated
USING (public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can remove tournament roles"
ON public.tournament_roles FOR DELETE TO authenticated
USING (public.can_manage_tournament_team(auth.uid(), tournament_id));

-- tournament_invitations policies
CREATE POLICY "Team managers can view tournament invitations"
ON public.tournament_invitations FOR SELECT TO authenticated
USING (public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can create tournament invitations"
ON public.tournament_invitations FOR INSERT TO authenticated
WITH CHECK (public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can update tournament invitations"
ON public.tournament_invitations FOR UPDATE TO authenticated
USING (public.can_manage_tournament_team(auth.uid(), tournament_id));

CREATE POLICY "Team managers can delete tournament invitations"
ON public.tournament_invitations FOR DELETE TO authenticated
USING (public.can_manage_tournament_team(auth.uid(), tournament_id));

-- Extend tournament access to invited team members (existing policies untouched)
CREATE POLICY "Team members can view their tournaments"
ON public.tournaments FOR SELECT TO authenticated
USING (public.has_tournament_role(auth.uid(), id));

CREATE POLICY "Tournament organizers and admins can update"
ON public.tournaments FOR UPDATE TO authenticated
USING (public.has_tournament_role(auth.uid(), id, ARRAY['organizer','admin']));

CREATE INDEX idx_tournament_roles_user ON public.tournament_roles(user_id);
CREATE INDEX idx_tournament_roles_tournament ON public.tournament_roles(tournament_id);
CREATE INDEX idx_tournament_invitations_token ON public.tournament_invitations(token);