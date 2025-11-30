-- Create function to reset weekly meal counts for all users
CREATE OR REPLACE FUNCTION public.reset_weekly_meal_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Reset weekly_meals_used to 0 and update weekly_reset_date to current date
  -- for all users where the current date is different from their weekly_reset_date
  UPDATE public.user_activity 
  SET 
    weekly_meals_used = 0,
    weekly_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE weekly_reset_date < CURRENT_DATE;
  
  -- Log the reset operation
  RAISE NOTICE 'Weekly meal counts reset for users with reset_date < %', CURRENT_DATE;
END;
$function$;

-- Create function to check if a user needs a weekly reset
CREATE OR REPLACE FUNCTION public.check_and_reset_user_weekly_count(user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_reset_date DATE;
  needs_reset boolean := false;
BEGIN
  -- Get the user's current reset date
  SELECT weekly_reset_date INTO user_reset_date
  FROM public.user_activity
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF user_reset_date IS NULL THEN
    INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
    VALUES (user_uuid, 0, 0, 0, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get the reset date again after potential insert
    SELECT weekly_reset_date INTO user_reset_date
    FROM public.user_activity
    WHERE user_id = user_uuid;
  END IF;
  
  -- Check if reset is needed (current date is different from reset date)
  IF user_reset_date < CURRENT_DATE THEN
    needs_reset := true;
    
    -- Reset the weekly count
    UPDATE public.user_activity 
    SET 
      weekly_meals_used = 0,
      weekly_reset_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN needs_reset;
END;
$function$;

-- Grant execute permissions to authenticated users for the check function
GRANT EXECUTE ON FUNCTION public.check_and_reset_user_weekly_count(UUID) TO authenticated;

-- Create a function to get user activity with automatic reset check
CREATE OR REPLACE FUNCTION public.get_user_activity_with_reset(user_uuid UUID)
RETURNS TABLE (
  meals_generated INTEGER,
  saved_recipes INTEGER,
  weekly_meals_used INTEGER,
  weekly_reset_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check and reset if needed
  PERFORM public.check_and_reset_user_weekly_count(user_uuid);
  
  -- Return the current activity data
  RETURN QUERY
  SELECT 
    ua.meals_generated,
    ua.saved_recipes,
    ua.weekly_meals_used,
    ua.weekly_reset_date
  FROM public.user_activity ua
  WHERE ua.user_id = user_uuid;
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_activity_with_reset(UUID) TO authenticated;

-- Add comment explaining the weekly reset system
COMMENT ON FUNCTION public.reset_weekly_meal_counts() IS 'Resets weekly meal counts for all users when called. Should be run weekly via scheduled function.';
COMMENT ON FUNCTION public.check_and_reset_user_weekly_count(UUID) IS 'Checks if a specific user needs a weekly reset and performs it if needed. Returns true if reset was performed.';
COMMENT ON FUNCTION public.get_user_activity_with_reset(UUID) IS 'Gets user activity data with automatic weekly reset check. Use this instead of direct table queries for activity data.';
