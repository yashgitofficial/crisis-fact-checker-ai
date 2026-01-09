-- Drop the restrictive view policy
DROP POLICY IF EXISTS "Users can view own posts or admins view all" ON public.distress_posts;

-- Create new policy allowing all authenticated users to view all posts
CREATE POLICY "Authenticated users can view all posts"
ON public.distress_posts
FOR SELECT
TO authenticated
USING (true);