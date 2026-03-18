
-- Admin can SELECT all tournaments
CREATE POLICY "Admins can view all tournaments"
ON public.tournaments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE all tournaments
CREATE POLICY "Admins can update all tournaments"
ON public.tournaments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can SELECT all tournament_registrations
CREATE POLICY "Admins can view all registrations"
ON public.tournament_registrations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can UPDATE all tournament_registrations
CREATE POLICY "Admins can update all registrations"
ON public.tournament_registrations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can INSERT tournament_registrations
CREATE POLICY "Admins can insert registrations"
ON public.tournament_registrations FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can DELETE tournament_registrations
CREATE POLICY "Admins can delete registrations"
ON public.tournament_registrations FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can manage sponsors
CREATE POLICY "Admins can manage sponsors"
ON public.tournament_sponsors FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage budget items
CREATE POLICY "Admins can manage budget items"
ON public.tournament_budget_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage photos
CREATE POLICY "Admins can manage photos"
ON public.tournament_photos FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage messages
CREATE POLICY "Admins can manage messages"
ON public.tournament_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage checklist items
CREATE POLICY "Admins can manage checklist items"
ON public.tournament_checklist_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage scores
CREATE POLICY "Admins can manage scores"
ON public.tournament_scores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage store products
CREATE POLICY "Admins can manage store products"
ON public.tournament_store_products FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage auction items
CREATE POLICY "Admins can manage auction items"
ON public.tournament_auction_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage auction bids
CREATE POLICY "Admins can manage auction bids"
ON public.tournament_auction_bids FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage donations
CREATE POLICY "Admins can manage donations"
ON public.tournament_donations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage surveys
CREATE POLICY "Admins can manage surveys"
ON public.tournament_surveys FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage survey questions
CREATE POLICY "Admins can manage survey questions"
ON public.tournament_survey_questions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage survey responses
CREATE POLICY "Admins can manage survey responses"
ON public.tournament_survey_responses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage volunteer roles
CREATE POLICY "Admins can manage volunteer roles"
ON public.tournament_volunteer_roles FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage volunteers
CREATE POLICY "Admins can manage volunteers"
ON public.tournament_volunteers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage registration addons
CREATE POLICY "Admins can manage registration addons"
ON public.tournament_registration_addons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage registration fields
CREATE POLICY "Admins can manage registration fields"
ON public.tournament_registration_fields FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can manage tournament promo codes
CREATE POLICY "Admins can manage tournament promo codes"
ON public.tournament_promo_codes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin can view all organizations
CREATE POLICY "Admins can view all organizations"
ON public.organizations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin can update all organizations
CREATE POLICY "Admins can update all organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));
