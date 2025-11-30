-- Add marketing_opt_in field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN marketing_opt_in BOOLEAN DEFAULT false;