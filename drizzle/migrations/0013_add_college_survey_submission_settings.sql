ALTER TABLE public.college_surveys
  ADD COLUMN IF NOT EXISTS submit_button_text text,
  ADD COLUMN IF NOT EXISTS response_copy_email text;

ALTER TABLE public.college_surveys
  ADD CONSTRAINT college_surveys_submit_button_text_length
    CHECK (submit_button_text IS NULL OR char_length(submit_button_text) BETWEEN 1 AND 80) NOT VALID,
  ADD CONSTRAINT college_surveys_response_copy_email_length
    CHECK (response_copy_email IS NULL OR char_length(response_copy_email) <= 320) NOT VALID;

COMMENT ON COLUMN public.college_surveys.submit_button_text IS 'Optional custom text for the public survey submit button.';
COMMENT ON COLUMN public.college_surveys.response_copy_email IS 'Optional email address copied on each new survey response notification.';