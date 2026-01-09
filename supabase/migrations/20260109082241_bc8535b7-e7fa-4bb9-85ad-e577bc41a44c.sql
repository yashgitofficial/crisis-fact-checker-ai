-- Add policy for anonymous/public read access to distress posts
CREATE POLICY "Anyone can view distress posts"
ON public.distress_posts
FOR SELECT
TO anon
USING (true);