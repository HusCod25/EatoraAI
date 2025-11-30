-- Cancel subscription and update source for test account mitzafortnai99@yahoo.com
-- This will:
-- 1. Cancel the subscription (set plan to 'free' and status to 'active' or 'revoked')
-- 2. Change source from 'stripe' to 'manual'
-- 3. Set cancellation dates

-- First, get the user ID
DO $$
DECLARE
  target_user_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get the user ID for mitzafortnai99@yahoo.com
  SELECT id INTO target_user_id
  FROM auth.users 
  WHERE email = 'mitzafortnai99@yahoo.com'
  LIMIT 1;

  -- Get an admin user ID for granted_by (use the first admin or the target user itself)
  SELECT user_id INTO admin_user_id
  FROM public.user_subscriptions
  WHERE plan = 'admin'
  LIMIT 1;

  -- If no admin found, use the target user itself
  IF admin_user_id IS NULL THEN
    admin_user_id := target_user_id;
  END IF;

  IF target_user_id IS NOT NULL THEN
    -- Update or insert the subscription record
    INSERT INTO public.user_subscriptions (
      user_id,
      plan,
      source,
      subscription_status,
      current_period_end,
      subscription_expires_at,
      cancellation_requested_at,
      cancellation_cancelled_at,
      granted_by,
      granted_at,
      updated_at,
      created_at
    ) VALUES (
      target_user_id,
      'free',
      'manual',
      'active', -- Set to 'active' instead of 'revoked' for a clean state
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      admin_user_id,
      NOW(),
      NOW(),
      COALESCE((SELECT created_at FROM public.user_subscriptions WHERE user_id = target_user_id), NOW())
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      plan = 'free',
      source = 'manual',
      subscription_status = 'active',
      current_period_end = NOW(),
      subscription_expires_at = NOW(),
      cancellation_requested_at = NOW(),
      cancellation_cancelled_at = NOW(),
      granted_by = admin_user_id,
      granted_at = NOW(),
      updated_at = NOW();
    
    RAISE NOTICE 'Successfully cancelled subscription and set source to manual for user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User mitzafortnai99@yahoo.com not found';
  END IF;
END $$;

-- Verify the update
SELECT 
  u.email,
  u.id as user_id,
  us.plan,
  us.source,
  us.subscription_status,
  us.current_period_end,
  us.cancellation_requested_at,
  us.cancellation_cancelled_at,
  us.granted_by,
  us.granted_at,
  us.updated_at
FROM auth.users u
LEFT JOIN public.user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'mitzafortnai99@yahoo.com';

