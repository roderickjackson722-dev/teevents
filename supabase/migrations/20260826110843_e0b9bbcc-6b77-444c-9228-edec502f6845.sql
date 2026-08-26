GRANT EXECUTE ON FUNCTION public.is_trip_organizer(uuid, uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.golf_trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_agenda TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_tee_times TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_games TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_skins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffle_tickets TO authenticated;

GRANT ALL ON public.golf_trips TO service_role;
GRANT ALL ON public.trip_participants TO service_role;
GRANT ALL ON public.trip_rooms TO service_role;
GRANT ALL ON public.trip_agenda TO service_role;
GRANT ALL ON public.trip_tee_times TO service_role;
GRANT ALL ON public.trip_games TO service_role;
GRANT ALL ON public.trip_skins TO service_role;
GRANT ALL ON public.trip_payments TO service_role;
GRANT ALL ON public.raffles TO service_role;
GRANT ALL ON public.raffle_tickets TO service_role;