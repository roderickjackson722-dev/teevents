
-- Create prospect_activities table for activity log/timeline
CREATE TABLE public.prospect_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

-- Only admin can manage activities (via edge function with service role)
CREATE POLICY "Admins can manage prospect activities"
  ON public.prospect_activities
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Make organization_id nullable on prospects for admin-level prospects
ALTER TABLE public.prospects ALTER COLUMN organization_id DROP NOT NULL;
