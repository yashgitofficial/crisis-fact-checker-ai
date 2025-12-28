-- Create distress_posts table for storing distress messages
CREATE TABLE public.distress_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  location TEXT NOT NULL,
  contact TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_status TEXT NOT NULL DEFAULT 'Pending',
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0,
  ai_reason TEXT NOT NULL DEFAULT 'Analyzing message...'
);

-- Enable Row Level Security (public access for hackathon demo)
ALTER TABLE public.distress_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view all posts (public feed)
CREATE POLICY "Anyone can view distress posts"
ON public.distress_posts
FOR SELECT
USING (true);

-- Allow anyone to insert new posts (no auth required for demo)
CREATE POLICY "Anyone can insert distress posts"
ON public.distress_posts
FOR INSERT
WITH CHECK (true);

-- Allow updating posts (for AI verification results)
CREATE POLICY "Anyone can update distress posts"
ON public.distress_posts
FOR UPDATE
USING (true);

-- Enable realtime for the distress_posts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.distress_posts;