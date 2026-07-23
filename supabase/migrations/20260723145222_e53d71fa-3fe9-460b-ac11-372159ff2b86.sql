ALTER TABLE public.college_surveys ADD COLUMN IF NOT EXISTS cta_label TEXT DEFAULT 'Take Our Survey';
ALTER TABLE public.college_surveys ADD COLUMN IF NOT EXISTS cta_description TEXT DEFAULT 'Share your feedback — it only takes a minute.';

-- Update the existing SAS HBCU Championship survey card text
UPDATE public.college_surveys
SET cta_label = 'Take Our Survey',
    cta_description = 'Student Survey responses are due by August 25, 2026.'
WHERE slug = 'sas-hbcu-invitational-student-survey';