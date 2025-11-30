-- Migration: Fix Weekly Reset on Subscription Update
-- This migration ensures that when a subscription is updated (upgraded/downgraded),
-- the weekly meal cycle resets to start from the update date

-- Step 1: Update the trigger function to reset cycle when plan changes
CREATE OR REPLACE FUNCTION public.initialize_user_activity_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  plan_changed boolean := false;
BEGIN
  -- Check if this is an UPDATE and if the plan changed
  -- OLD is available in UPDATE triggers, compare OLD.plan with NEW.plan
  IF TG_OP = 'UPDATE' AND OLD.plan IS DISTINCT FROM NEW.plan THEN
    plan_changed := true;
  END IF;
  
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
    CURRENT_DATE  -- Use current date for new subscriptions
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    -- If plan changed, reset cycle start date to today and reset weekly meals
    subscription_cycle_start_date = CASE 
      WHEN plan_changed THEN CURRENT_DATE
      ELSE COALESCE(user_activity.subscription_cycle_start_date, CURRENT_DATE)
    END,
    -- Reset weekly meals if plan changed
    weekly_meals_used = CASE 
      WHEN plan_changed THEN 0
      ELSE user_activity.weekly_meals_used
    END,
    weekly_reset_date = CASE 
      WHEN plan_changed THEN CURRENT_DATE
      ELSE user_activity.weekly_reset_date
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;

-- Step 2: Add comment explaining the behavior
COMMENT ON FUNCTION public.initialize_user_activity_cycle() IS 'Initializes or resets user activity cycle. When subscription plan changes, resets weekly meal cycle to start from the update date.';

-- Step 3: Verify the trigger exists (it should from previous migration)
-- The trigger should already exist, but we'll ensure it's correct
DROP TRIGGER IF EXISTS on_subscription_created_initialize_cycle ON public.user_subscriptions;

CREATE TRIGGER on_subscription_created_initialize_cycle
  AFTER INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_activity_cycle();

