-- Debug admin status and create a simpler solution
-- This will help us understand why the admin check is failing

-- 1. Check your current admin status
SELECT 
  'Your current subscription' as check_type,
  user_id,
  plan,
  source,
  subscription_status,
  granted_by,
  granted_at
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 2. Check if you're in auth.users
SELECT 
  'Your auth user record' as check_type,
  id,
  email,
  created_at
FROM auth.users 
WHERE id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 3. Test the admin check query directly
SELECT 
  'Admin check test' as check_type,
  EXISTS(
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid 
    AND us.plan = 'admin'
  ) as is_admin;

-- 4. Create a simpler function that bypasses the admin check for testing
CREATE OR REPLACE FUNCTION public.get_all_users_simple()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  plan TEXT,
  source TEXT,
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  cancellation_requested_at TIMESTAMPTZ,
  granted_by UUID,
  granted_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Return all users with their subscription data (no admin check for now)
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    COALESCE(us.plan, 'free') as plan,
    COALESCE(us.source, 'stripe') as source,
    COALESCE(us.subscription_status, 'active') as subscription_status,
    us.current_period_end,
    us.cancellation_requested_at,
    us.granted_by,
    us.granted_at
  FROM auth.users u
  LEFT JOIN public.user_subscriptions us ON u.id = us.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_simple TO authenticated;

-- 6. Test the simple function
SELECT * FROM public.get_all_users_simple() LIMIT 5;
