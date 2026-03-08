
-- Team member permissions enum
CREATE TYPE public.org_permission AS ENUM (
  'manage_players',
  'manage_registration', 
  'manage_budget',
  'manage_sponsors',
  'manage_messages',
  'manage_leaderboard',
  'manage_store',
  'manage_auction',
  'manage_gallery',
  'manage_volunteers',
  'manage_surveys',
  'manage_donations',
  'manage_check_in',
  'manage_settings'
);

-- Invitations table for inviting team members
CREATE TABLE public.org_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  permissions org_permission[] NOT NULL DEFAULT '{}',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(organization_id, email)
);

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can manage invitations
CREATE POLICY "Owners can manage invitations" ON public.org_invitations
  FOR ALL TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- Members can view invitations
CREATE POLICY "Members can view invitations" ON public.org_invitations
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Add permissions column to org_members
ALTER TABLE public.org_members ADD COLUMN IF NOT EXISTS permissions org_permission[] NOT NULL DEFAULT '{}';

-- Notification emails table
CREATE TABLE public.notification_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notify_registration BOOLEAN NOT NULL DEFAULT true,
  notify_donation BOOLEAN NOT NULL DEFAULT true,
  notify_store_purchase BOOLEAN NOT NULL DEFAULT true,
  notify_auction_bid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email)
);

ALTER TABLE public.notification_emails ENABLE ROW LEVEL SECURITY;

-- Org members can manage notification emails
CREATE POLICY "Org owners can manage notification emails" ON public.notification_emails
  FOR ALL TO authenticated
  USING (is_org_owner(auth.uid(), organization_id))
  WITH CHECK (is_org_owner(auth.uid(), organization_id));

-- Members can view notification emails
CREATE POLICY "Members can view notification emails" ON public.notification_emails
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));
