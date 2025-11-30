-- Remove first_name and last_name columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_name;

-- Add username_updated_at column to track when username was last changed
ALTER TABLE public.profiles ADD COLUMN username_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update the handle_new_user_complete function to not reference first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert profile with username from metadata if available
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username'
  );
  
  -- Insert subscription
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free');
  
  -- Insert user activity with all zeros
  INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used)
  VALUES (NEW.id, 0, 0, 0);
  
  RETURN NEW;
END;
$function$;

-- Update the handle_new_user function to not reference first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username'
  );
  RETURN NEW;
END;
$function$;