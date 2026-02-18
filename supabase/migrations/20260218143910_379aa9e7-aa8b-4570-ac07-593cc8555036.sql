
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL,
  organization TEXT DEFAULT '',
  text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are publicly readable
CREATE POLICY "Reviews are publicly readable"
ON public.reviews FOR SELECT
USING (true);

-- Admins can manage reviews
CREATE POLICY "Admins can insert reviews"
ON public.reviews FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reviews"
ON public.reviews FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reviews"
ON public.reviews FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing reviews
INSERT INTO public.reviews (author, organization, text, sort_order) VALUES
('Daniel Sterling Davis', 'Tap That Ash Cigar Club', 'As one of the founders of Tap That Ash, I am proud to endorse Rod Jackson and TeeVents on an amazing experience for our 4th Annual Father''s Day Event. Previously we have managed and put together the event...and it took a lot of work to pull it off successfully. But, this year Rod and his team were able to take the process to an easier and more profitable level. From the registration process to the small details once golfers arrived at the course, it was a tremendous upgrade. Rod is extremely professional and his team is knowledgeable which showed in every way at the event, and participants stated that they had an outstanding experience. To say that we were pleased is an understatement…we have decided to trust TeeVents and Rod Jackson with our future golf events.', 0),
('National Black College Alumni Hall of Fame Foundation, Inc.', '', 'We called Rod at TeeVents for last minute help with our annual tournament. He was able to make quick changes and adjustments that made our tournament more effective. TeeVents was so informative and helpful we decided to use their services for the next years event.', 1),
('Jamila Johnson', 'University of Maryland Eastern Shore', 'TeeVents did an excellent job of addressing the needs of the client and paying attention to the details. Definitely hands on and consistent communication was the pinnacle of their supervision and participation. I look forward to participating in any of their future events. Thank you TeeVents, for a job well done!', 2),
('Coach Gelow', 'Savannah State University', 'Just a quick comment to you my friend!! That was the very best event we have experienced in Atlanta at the HOF Golf tournament!!! Congratulations to all. Job well done!!!!!', 3);
