-- Fix grant_user_subscription function to properly cast TEXT to subscription_plan enum
-- This fixes the error: "column "plan" is of type subscription_plan but expression is of type text"

CREATE OR REPLACE FUNCTION public.grant_user_subscription(
  target_user_uuid UUID,
  new_plan TEXT,
  days INTEGER DEFAULT NULL,
  is_lifetime BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan::text = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN FALSE;
  END IF;
  
  -- Prevent granting to users with Stripe source
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = target_user_uuid AND source = 'stripe'
  ) THEN
    RAISE EXCEPTION 'Cannot grant subscription to user with active Stripe subscription';
  END IF;
  
  -- Validate that new_plan is a valid enum value
  IF new_plan NOT IN ('free', 'beginner', 'chef', 'unlimited') THEN
    RAISE EXCEPTION 'Invalid plan type: %. Valid values are: free, beginner, chef, unlimited', new_plan;
  END IF;
  
  -- Calculate expiry date
  IF is_lifetime THEN
    expiry_date := NULL; -- No expiry for lifetime
  ELSIF days IS NOT NULL THEN
    expiry_date := NOW() + (days || ' days')::INTERVAL;
  ELSE
    expiry_date := NOW() + INTERVAL '1 month'; -- Default 1 month
  END IF;
  
  -- Insert or update subscription
  -- Cast new_plan to subscription_plan enum type
  INSERT INTO public.user_subscriptions (
    user_id, 
    plan, 
    source,
    subscription_status,
    current_period_end,
    subscription_expires_at,
    granted_by,
    granted_at,
    created_at,
    updated_at
  ) VALUES (
    target_user_uuid,
    new_plan::subscription_plan,  -- Cast TEXT to subscription_plan enum
    'manual',
    'active',
    expiry_date,
    expiry_date,
    auth.uid(),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    plan = EXCLUDED.plan,
    source = 'manual',
    subscription_status = 'active',
    current_period_end = EXCLUDED.current_period_end,
    subscription_expires_at = EXCLUDED.subscription_expires_at,
    granted_by = EXCLUDED.granted_by,
    granted_at = EXCLUDED.granted_at,
    cancellation_requested_at = NULL,
    cancellation_cancelled_at = NULL,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.grant_user_subscription TO authenticated;

