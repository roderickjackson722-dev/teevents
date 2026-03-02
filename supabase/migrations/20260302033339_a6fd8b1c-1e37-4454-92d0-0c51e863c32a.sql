CREATE POLICY "Org members can update messages"
ON public.tournament_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_messages.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_messages.tournament_id
    AND is_org_member(auth.uid(), t.organization_id)
  )
);