-- Add user_id column to track post ownership
ALTER TABLE public.distress_posts 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view distress posts" ON public.distress_posts;
DROP POLICY IF EXISTS "Authenticated users can insert distress posts" ON public.distress_posts;
DROP POLICY IF EXISTS "Admins can update distress posts" ON public.distress_posts;
DROP POLICY IF EXISTS "Admins can delete distress posts" ON public.distress_posts;

-- Create new RLS policies with ownership tracking
-- Users can view their own posts or admins can view all
CREATE POLICY "Users can view own posts or admins view all"
ON public.distress_posts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can only insert posts with their own user_id
CREATE POLICY "Users can insert own posts"
ON public.distress_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can update any post
CREATE POLICY "Admins can update posts"
ON public.distress_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any post
CREATE POLICY "Admins can delete posts"
ON public.distress_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));