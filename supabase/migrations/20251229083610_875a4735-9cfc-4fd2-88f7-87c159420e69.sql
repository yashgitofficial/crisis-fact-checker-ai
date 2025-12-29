-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing permissive policies on distress_posts
DROP POLICY IF EXISTS "Anyone can insert distress posts" ON public.distress_posts;
DROP POLICY IF EXISTS "Anyone can update distress posts" ON public.distress_posts;
DROP POLICY IF EXISTS "Anyone can view distress posts" ON public.distress_posts;

-- Create new secure RLS policies for distress_posts

-- Only authenticated users can view posts (protects contact info)
CREATE POLICY "Authenticated users can view distress posts"
ON public.distress_posts
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can submit reports
CREATE POLICY "Authenticated users can insert distress posts"
ON public.distress_posts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only admins can update posts (verification status, etc.)
CREATE POLICY "Admins can update distress posts"
ON public.distress_posts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete posts
CREATE POLICY "Admins can delete distress posts"
ON public.distress_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));