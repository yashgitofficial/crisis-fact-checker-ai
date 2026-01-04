-- Add latitude and longitude columns to distress_posts table
ALTER TABLE public.distress_posts 
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;