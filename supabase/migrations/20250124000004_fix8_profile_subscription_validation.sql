-- FIX 8 — Profile & Subscription Validation
-- Verify plan, correct access, weekly limits

-- 1. Create function to validate user subscription and plan
CREATE OR REPLACE FUNCTION public.validate_user_subscription(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription RECORD;
  plan_limits RECORD;
  user_activity RECORD;
  validation_result JSONB;
  errors TEXT[] := ARRAY[]::TEXT[];
  warnings TEXT[] := ARRAY[]::TEXT[];
  is_valid BOOLEAN := true;
BEGIN
  -- Get user subscription
  SELECT * INTO user_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;
  
  -- Check if subscription exists
  IF user_subscription IS NULL THEN
    errors := array_append(errors, 'User subscription not found');
    is_valid := false;
  ELSE
    -- Get plan limits
    SELECT * INTO plan_limits
    FROM public.plan_limits
    WHERE plan = user_subscription.plan;
    
    IF plan_limits IS NULL THEN
      errors := array_append(errors, format('Plan limits not found for plan: %s', user_subscription.plan));
      is_valid := false;
    END IF;
    
    -- Check subscription status
    IF user_subscription.subscription_status NOT IN ('active', 'trialing') THEN
      warnings := array_append(warnings, format('Subscription status is: %s', user_subscription.subscription_status));
    END IF;
    
    -- Check if subscription has expired
    IF user_subscription.current_period_end IS NOT NULL 
       AND user_subscription.current_period_end < now() 
       AND user_subscription.subscription_status = 'active' THEN
      errors := array_append(errors, 'Subscription has expired but status is still active');
      is_valid := false;
    END IF;
  END IF;
  
  -- Get user activity
  SELECT * INTO user_activity
  FROM public.user_activity
  WHERE user_id = p_user_id;
  
  IF user_activity IS NOT NULL AND plan_limits IS NOT NULL THEN
    -- Check weekly meal limit
    IF plan_limits.meals_per_week IS NOT NULL 
       AND user_activity.weekly_meals_used >= plan_limits.meals_per_week THEN
      warnings := array_append(warnings, format('Weekly meal limit reached: %d/%d', 
        user_activity.weekly_meals_used, plan_limits.meals_per_week));
    END IF;
    
    -- Check ingredient limit
    IF plan_limits.max_ingredients IS NOT NULL THEN
      -- Note: This would need to check actual ingredient count from user's saved ingredients
      -- For now, we just validate the limit exists
    END IF;
  END IF;
  
  -- Build validation result
  validation_result := jsonb_build_object(
    'is_valid', is_valid,
    'errors', errors,
    'warnings', warnings,
    'subscription', CASE WHEN user_subscription IS NOT NULL THEN 
      jsonb_build_object(
        'plan', user_subscription.plan,
        'status', user_subscription.subscription_status,
        'current_period_end', user_subscription.current_period_end
      ) ELSE NULL END,
    'plan_limits', CASE WHEN plan_limits IS NOT NULL THEN 
      jsonb_build_object(
        'meals_per_week', plan_limits.meals_per_week,
        'max_ingredients', plan_limits.max_ingredients,
        'max_saved_meals', plan_limits.max_saved_meals
      ) ELSE NULL END,
    'activity', CASE WHEN user_activity IS NOT NULL THEN
      jsonb_build_object(
        'weekly_meals_used', user_activity.weekly_meals_used,
        'meals_generated', user_activity.meals_generated
      ) ELSE NULL END
  );
  
  RETURN validation_result;
END;
$$;

-- 2. Create function to check if user can access feature
CREATE OR REPLACE FUNCTION public.can_user_access_feature(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan TEXT;
  plan_limits RECORD;
  has_access BOOLEAN := false;
BEGIN
  -- Get user plan
  SELECT plan INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  AND subscription_status IN ('active', 'trialing');
  
  IF user_plan IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get plan limits
  SELECT * INTO plan_limits
  FROM public.plan_limits
  WHERE plan = user_plan;
  
  IF plan_limits IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check feature access based on plan
  CASE p_feature
    WHEN 'advanced_recipes' THEN
      has_access := plan_limits.has_advanced_recipes;
    WHEN 'personalized_suggestions' THEN
      has_access := plan_limits.has_personalized_suggestions;
    WHEN 'personalized_themes' THEN
      has_access := plan_limits.has_personalized_themes;
    ELSE
      has_access := false;
  END CASE;
  
  RETURN has_access;
END;
$$;

-- 3. Create function to check weekly meal limit
CREATE OR REPLACE FUNCTION public.check_weekly_meal_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription RECORD;
  plan_limits RECORD;
  user_activity RECORD;
  result JSONB;
  can_generate BOOLEAN := false;
  remaining_meals INTEGER;
BEGIN
  -- Get user subscription
  SELECT * INTO user_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  AND subscription_status IN ('active', 'trialing');
  
  IF user_subscription IS NULL THEN
    RETURN jsonb_build_object(
      'can_generate', false,
      'reason', 'No active subscription found',
      'remaining_meals', 0,
      'limit', 0
    );
  END IF;
  
  -- Get plan limits
  SELECT * INTO plan_limits
  FROM public.plan_limits
  WHERE plan = user_subscription.plan;
  
  IF plan_limits IS NULL THEN
    RETURN jsonb_build_object(
      'can_generate', false,
      'reason', 'Plan limits not found',
      'remaining_meals', 0,
      'limit', 0
    );
  END IF;
  
  -- Get user activity (with automatic reset check)
  SELECT * INTO user_activity
  FROM public.user_activity
  WHERE user_id = p_user_id;
  
  -- Check if reset is needed
  IF user_activity IS NOT NULL THEN
    PERFORM public.check_and_reset_user_weekly_count(p_user_id);
    
    -- Refresh activity after potential reset
    SELECT * INTO user_activity
    FROM public.user_activity
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check limit
  IF plan_limits.meals_per_week IS NULL THEN
    -- Unlimited
    can_generate := true;
    remaining_meals := -1; -- -1 means unlimited
  ELSE
    remaining_meals := GREATEST(0, plan_limits.meals_per_week - COALESCE(user_activity.weekly_meals_used, 0));
    can_generate := remaining_meals > 0;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'can_generate', can_generate,
    'remaining_meals', remaining_meals,
    'limit', plan_limits.meals_per_week,
    'used', COALESCE(user_activity.weekly_meals_used, 0),
    'plan', user_subscription.plan
  );
  
  RETURN result;
END;
$$;

-- 4. Create function to validate profile completeness
CREATE OR REPLACE FUNCTION public.validate_user_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  user_subscription RECORD;
  validation_result JSONB;
  errors TEXT[] := ARRAY[]::TEXT[];
  warnings TEXT[] := ARRAY[]::TEXT[];
  is_complete BOOLEAN := true;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Check if profile exists
  IF user_profile IS NULL THEN
    errors := array_append(errors, 'User profile not found');
    is_complete := false;
  ELSE
    -- Check if username is set
    IF user_profile.username IS NULL OR TRIM(user_profile.username) = '' THEN
      warnings := array_append(warnings, 'Username is not set');
    END IF;
  END IF;
  
  -- Get user subscription
  SELECT * INTO user_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id;
  
  IF user_subscription IS NULL THEN
    errors := array_append(errors, 'User subscription not found');
    is_complete := false;
  END IF;
  
  -- Build validation result
  validation_result := jsonb_build_object(
    'is_complete', is_complete,
    'errors', errors,
    'warnings', warnings,
    'has_profile', user_profile IS NOT NULL,
    'has_subscription', user_subscription IS NOT NULL,
    'has_username', user_profile IS NOT NULL AND user_profile.username IS NOT NULL AND TRIM(user_profile.username) != ''
  );
  
  RETURN validation_result;
END;
$$;

-- 5. Create trigger to auto-validate subscription on update
CREATE OR REPLACE FUNCTION public.auto_validate_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  validation_result JSONB;
BEGIN
  -- If subscription status changed to inactive/canceled, validate
  IF NEW.subscription_status != OLD.subscription_status 
     AND NEW.subscription_status NOT IN ('active', 'trialing') THEN
    -- Auto-downgrade to free if subscription is canceled/expired
    IF NEW.plan != 'free' THEN
      NEW.plan := 'free';
      RAISE NOTICE 'Subscription % for user % downgraded to free plan', NEW.id, NEW.user_id;
    END IF;
  END IF;
  
  -- If current_period_end is in the past and status is active, mark as expired
  IF NEW.current_period_end IS NOT NULL 
     AND NEW.current_period_end < now() 
     AND NEW.subscription_status = 'active' THEN
    NEW.subscription_status := 'past_due';
    RAISE NOTICE 'Subscription % for user % marked as past_due', NEW.id, NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_validate_subscription ON public.user_subscriptions;
CREATE TRIGGER trg_auto_validate_subscription
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.auto_validate_subscription();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_feature(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_weekly_meal_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_profile(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.validate_user_subscription(UUID) IS 'Validates user subscription and plan access';
COMMENT ON FUNCTION public.can_user_access_feature(UUID, TEXT) IS 'Checks if user can access a specific feature based on their plan';
COMMENT ON FUNCTION public.check_weekly_meal_limit(UUID) IS 'Checks weekly meal generation limit for user';
COMMENT ON FUNCTION public.validate_user_profile(UUID) IS 'Validates user profile completeness';

