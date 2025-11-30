-- Fix: Database error when creating new user
-- This script fixes the trigger that creates profile and subscription on signup

-- 1. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create or replace the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Insert profile with username from metadata if available (handle NULL gracefully)
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert subscription (handle conflict if exists)
  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user activity with all zeros (handle conflict if exists)
  INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
  VALUES (NEW.id, 0, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_complete for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 3. Create trigger to execute function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();

-- 4. Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- 5. Test the function (optional - replace with a test user ID)
-- SELECT public.handle_new_user_complete() FROM auth.users LIMIT 1;

