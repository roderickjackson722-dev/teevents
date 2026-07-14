
DROP POLICY IF EXISTS "Anyone signed-in can read courses" ON public.course_database;
CREATE POLICY "Signed-in users can read public or own courses"
  ON public.course_database
  FOR SELECT
  TO authenticated
  USING (
    coalesce(is_public, false) = true
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.pe_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;
