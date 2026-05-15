
-- ============================================================
-- 1) COLLEGE TOURNAMENT INVITATIONS — lock down + token RPCs
-- ============================================================
DROP POLICY IF EXISTS "Public can view own invitations" ON public.college_tournament_invitations;
DROP POLICY IF EXISTS "Public can update own rsvp" ON public.college_tournament_invitations;

CREATE OR REPLACE FUNCTION public.get_college_invitation_by_token(_token text, _tournament_id uuid)
RETURNS SETOF public.college_tournament_invitations
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.college_tournament_invitations
  WHERE token = _token AND tournament_id = _tournament_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_college_invitation_rsvp_by_token(
  _token text, _response text
) RETURNS public.college_tournament_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.college_tournament_invitations;
BEGIN
  IF _response NOT IN ('accepted','declined') THEN
    RAISE EXCEPTION 'Invalid RSVP response';
  END IF;
  UPDATE public.college_tournament_invitations
  SET rsvp_response = _response, rsvp_date = now()
  WHERE token = _token
  RETURNING * INTO inv;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  RETURN inv;
END;
$$;

REVOKE ALL ON FUNCTION public.get_college_invitation_by_token(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_college_invitation_rsvp_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_college_invitation_by_token(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_college_invitation_rsvp_by_token(text, text) TO anon, authenticated;

-- ============================================================
-- 2) COLLEGE TOURNAMENT REGISTRATIONS — drop public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can view own registrations" ON public.college_tournament_registrations;

-- ============================================================
-- 3) TOURNAMENT AUCTION BIDS — drop public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can view own bids" ON public.tournament_auction_bids;

-- ============================================================
-- 4) TOURNAMENT WAITLIST — drop public SELECT, remove realtime
-- ============================================================
DROP POLICY IF EXISTS "Public can view own waitlist" ON public.tournament_waitlist;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tournament_waitlist'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.tournament_waitlist';
  END IF;
END $$;

-- ============================================================
-- 5) EVENT ACCESS REQUESTS — drop anon SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own access request" ON public.event_access_requests;

-- ============================================================
-- 6) PAYOUT CHANGE REQUESTS — drop overly broad public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Public can read pending request by token" ON public.payout_change_requests;

-- ============================================================
-- 7) TOURNAMENT DONATIONS — drop public UPDATE (webhook-only)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can update donation status" ON public.tournament_donations;

-- ============================================================
-- 8) DEMO LEADS — drop public UPDATE, expose limited RPCs
-- ============================================================
DROP POLICY IF EXISTS "Anyone can update a demo lead" ON public.demo_leads;

CREATE OR REPLACE FUNCTION public.mark_demo_lead_started(
  _id uuid, _role text, _user_agent text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.demo_leads
  SET role = _role,
      demo_started_at = now(),
      user_agent = COALESCE(_user_agent, user_agent)
  WHERE id = _id;
$$;

CREATE OR REPLACE FUNCTION public.update_demo_lead_feedback(
  _id uuid,
  _reasons text[],
  _score integer,
  _text text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.demo_leads
  SET feedback_reasons = _reasons,
      feedback_score = _score,
      feedback_text = NULLIF(left(COALESCE(_text,''), 2000), ''),
      feedback_submitted_at = now()
  WHERE id = _id;
$$;

REVOKE ALL ON FUNCTION public.mark_demo_lead_started(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_demo_lead_feedback(uuid, text[], integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_demo_lead_started(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_demo_lead_feedback(uuid, text[], integer, text) TO anon, authenticated;
