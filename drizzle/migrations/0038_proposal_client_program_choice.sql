ALTER TABLE public.proposal_web_documents ADD COLUMN program_chosen text, ADD COLUMN program_chosen_at timestamptz, ADD COLUMN acceptance_email_sent_at timestamptz;
ALTER TABLE public.proposal_web_documents DROP CONSTRAINT proposal_web_documents_status_check;
ALTER TABLE public.proposal_web_documents ADD CONSTRAINT proposal_web_documents_status_check CHECK (status IN ('draft','sent','accepted','declined','accepted_pending_confirmation'));
ALTER TABLE public.proposal_web_documents ADD CONSTRAINT proposal_program_chosen_check CHECK (program_chosen IS NULL OR program_chosen IN ('No Cost to Start','Per Event','Per League','Enterprise','Full Service Management'));
CREATE FUNCTION public.choose_proposal_program(_token text, _program text, _expected_updated_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.proposal_web_documents%ROWTYPE;
BEGIN
SELECT * INTO d FROM public.proposal_web_documents WHERE access_token=_token AND length(_token)=64 FOR UPDATE;
IF d.id IS NULL THEN RAISE EXCEPTION 'Proposal unavailable'; END IF;
IF d.program_chosen IS NOT NULL THEN
 IF d.program_chosen <> _program THEN RAISE EXCEPTION 'A choice has already been recorded'; END IF;
 RETURN jsonb_build_object('id',d.id,'payload',d.payload,'chosen_at',d.program_chosen_at,'email_sent_at',d.acceptance_email_sent_at);
END IF;
IF d.status <> 'sent' OR d.updated_at <> _expected_updated_at OR NOT (d.payload->'packages' ? _program) OR _program NOT IN ('No Cost to Start','Per Event','Per League','Enterprise','Full Service Management') OR COALESCE((d.payload->>'closureEnabled')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'Proposal is not available for this choice'; END IF;
UPDATE public.proposal_web_documents SET program_chosen=_program, program_chosen_at=now(),status='accepted_pending_confirmation' WHERE id=d.id RETURNING * INTO d;
RETURN jsonb_build_object('id',d.id,'payload',d.payload,'chosen_at',d.program_chosen_at,'email_sent_at',d.acceptance_email_sent_at);
END $$;
REVOKE ALL ON FUNCTION public.choose_proposal_program(text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.choose_proposal_program(text,text,timestamptz) TO service_role;