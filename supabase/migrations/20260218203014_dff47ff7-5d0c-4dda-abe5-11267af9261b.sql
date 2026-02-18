-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT, INSERT ON public.event_access_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_access_requests TO authenticated;

-- Also ensure other tables have proper grants
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.event_resources TO anon;
GRANT SELECT ON public.event_resources TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
GRANT SELECT ON public.approved_emails TO authenticated;
GRANT ALL ON public.event_resources TO authenticated;
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.events TO authenticated;
GRANT ALL ON public.approved_emails TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;