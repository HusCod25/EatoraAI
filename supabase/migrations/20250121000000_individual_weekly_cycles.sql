-- Migration: Individual Weekly Meal Reset Cycles
-- This migration updates the weekly reset system to reset each user's meal count
-- every 7 days based on when they started their subscription (individual cycles)

-- Step 1: Add subscription_cycle_start_date column to user_activity table
ALTER TABLE public.user_activity
ADD COLUMN IF NOT EXISTS subscription_cycle_start_date DATE;

-- Step 2: Initialize subscription_cycle_start_date for existing users
-- Use subscription created_at date as the cycle start date
UPDATE public.user_activity ua
SET subscription_cycle_start_date = COALESCE(
  (SELECT us.created_at::DATE 
   FROM public.user_subscriptions us 
   WHERE us.user_id = ua.user_id 
   LIMIT 1),
  ua.created_at::DATE,
  CURRENT_DATE
)
WHERE subscription_cycle_start_date IS NULL;

-- Step 3: Set default for any new records (will be set via trigger/function)
-- For now, set to current date for any remaining NULL values
UPDATE public.user_activity
SET subscription_cycle_start_date = CURRENT_DATE
WHERE subscription_cycle_start_date IS NULL;

-- Step 4: Replace the check_and_reset_user_weekly_count function
-- This now checks if 7 days have passed since subscription_cycle_start_date
CREATE OR REPLACE FUNCTION public.check_and_reset_user_weekly_count(user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_cycle_start_date DATE;
  user_reset_date DATE;
  days_since_cycle_start INTEGER;
  needs_reset boolean := false;
  subscription_created_at DATE;
  weeks_passed INTEGER;
  new_cycle_start_date DATE;
BEGIN
  -- Get the user's subscription created_at date (when they started)
  SELECT created_at::DATE INTO subscription_created_at
  FROM public.user_subscriptions
  WHERE user_id = user_uuid
  LIMIT 1;
  
  -- If no subscription exists, create one (shouldn't happen, but safety check)
  IF subscription_created_at IS NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan)
    VALUES (user_uuid, 'free')
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT created_at::DATE INTO subscription_created_at
    FROM public.user_subscriptions
    WHERE user_id = user_uuid
    LIMIT 1;
  END IF;
  
  -- Get or create user_activity record
  SELECT subscription_cycle_start_date, weekly_reset_date INTO user_cycle_start_date, user_reset_date
  FROM public.user_activity
  WHERE user_id = user_uuid;
  
  -- If no activity record exists, create one
  IF user_cycle_start_date IS NULL THEN
    INSERT INTO public.user_activity (
      user_id, 
      meals_generated, 
      saved_recipes, 
      weekly_meals_used, 
      weekly_reset_date,
      subscription_cycle_start_date
    )
    VALUES (
      user_uuid, 
      0, 
      0, 
      0, 
      CURRENT_DATE,
      subscription_created_at
    )
    ON CONFLICT (user_id) DO UPDATE
    SET subscription_cycle_start_date = COALESCE(
      user_activity.subscription_cycle_start_date,
      subscription_created_at
    );
    
    -- Get the cycle start date again after potential insert/update
    SELECT subscription_cycle_start_date INTO user_cycle_start_date
    FROM public.user_activity
    WHERE user_id = user_uuid;
  END IF;
  
  -- Ensure cycle start date is set (fallback to subscription created_at)
  IF user_cycle_start_date IS NULL THEN
    user_cycle_start_date := subscription_created_at;
  END IF;
  
  -- Calculate days since cycle start
  days_since_cycle_start := CURRENT_DATE - user_cycle_start_date;
  
  -- Check if 7 days have passed since cycle start
  IF days_since_cycle_start >= 7 THEN
    needs_reset := true;
    
    -- Calculate how many full 7-day cycles have passed
    -- Advance the cycle start date by that many weeks
    -- This ensures the cycle continues properly even if multiple weeks passed
    weeks_passed := days_since_cycle_start / 7;
    new_cycle_start_date := user_cycle_start_date + (weeks_passed * 7);
    
    -- Reset the weekly count and advance cycle start date
    UPDATE public.user_activity 
    SET 
      weekly_meals_used = 0,
      weekly_reset_date = CURRENT_DATE,
      subscription_cycle_start_date = new_cycle_start_date,
      updated_at = now()
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN needs_reset;
END;
$function$;

-- Step 5: Update reset_weekly_meal_counts function to work with individual cycles
CREATE OR REPLACE FUNCTION public.reset_weekly_meal_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Reset weekly_meals_used for all users where 7 days have passed since cycle start
  -- This function now respects individual cycles
  UPDATE public.user_activity ua
  SET 
    weekly_meals_used = 0,
    weekly_reset_date = CURRENT_DATE,
    subscription_cycle_start_date = subscription_cycle_start_date + (
      ((CURRENT_DATE - subscription_cycle_start_date) / 7) * 7
    ),
    updated_at = now()
  WHERE (CURRENT_DATE - COALESCE(subscription_cycle_start_date, CURRENT_DATE)) >= 7;
  
  -- Log the reset operation
  RAISE NOTICE 'Weekly meal counts reset for users with 7+ days since cycle start';
END;
$function$;

-- Step 6: Update get_user_activity_with_reset to include subscription_cycle_start_date
-- Drop the function first since we're changing the return type
DROP FUNCTION IF EXISTS public.get_user_activity_with_reset(UUID);

CREATE OR REPLACE FUNCTION public.get_user_activity_with_reset(user_uuid UUID)
RETURNS TABLE (
  meals_generated INTEGER,
  saved_recipes INTEGER,
  weekly_meals_used INTEGER,
  weekly_reset_date DATE,
  subscription_cycle_start_date DATE
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
    ua.weekly_reset_date,
    ua.subscription_cycle_start_date
  FROM public.user_activity ua
  WHERE ua.user_id = user_uuid;
END;
$function$;

-- Step 7: Create trigger to initialize subscription_cycle_start_date when subscription is created/updated
CREATE OR REPLACE FUNCTION public.initialize_user_activity_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- When a subscription is created or updated, ensure user_activity has cycle_start_date
  INSERT INTO public.user_activity (
    user_id,
    meals_generated,
    saved_recipes,
    weekly_meals_used,
    weekly_reset_date,
    subscription_cycle_start_date
  )
  VALUES (
    NEW.user_id,
    0,
    0,
    0,
    CURRENT_DATE,
    NEW.created_at::DATE
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    -- Only update cycle start date if it's NULL (first time setting it)
    subscription_cycle_start_date = COALESCE(
      user_activity.subscription_cycle_start_date,
      NEW.created_at::DATE
    ),
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_subscription_created_initialize_cycle ON public.user_subscriptions;

CREATE TRIGGER on_subscription_created_initialize_cycle
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_activity_cycle();

-- Step 8: Update plan_limits to ensure unlimited plan has NULL for meals_per_week
-- First, alter the column to allow NULL values
ALTER TABLE public.plan_limits
ALTER COLUMN meals_per_week DROP NOT NULL;

-- Now update unlimited plan to have NULL for meals_per_week
-- (This ensures proper handling of unlimited plans in the UI)
UPDATE public.plan_limits
SET meals_per_week = NULL
WHERE plan = 'unlimited' AND meals_per_week IS NOT NULL;

-- If the unlimited plan doesn't exist, insert it
INSERT INTO public.plan_limits (plan, meals_per_week, max_ingredients, max_saved_meals, has_advanced_recipes, has_personalized_suggestions, has_personalized_themes)
VALUES ('unlimited', NULL, NULL, NULL, true, true, true)
ON CONFLICT (plan) DO UPDATE
SET meals_per_week = NULL;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN public.user_activity.subscription_cycle_start_date IS 'The date when the current 7-day meal reset cycle started. Resets every 7 days from this date.';
COMMENT ON FUNCTION public.check_and_reset_user_weekly_count(UUID) IS 'Checks if a specific user needs a weekly reset based on 7-day cycles from subscription start date. Returns true if reset was performed.';
COMMENT ON FUNCTION public.reset_weekly_meal_counts() IS 'Resets weekly meal counts for all users whose 7-day cycle has completed. Respects individual subscription start dates.';

