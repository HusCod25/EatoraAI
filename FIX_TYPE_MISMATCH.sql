-- Fix type mismatch in the admin function
-- This resolves the "structure of query does not match function result type" error

-- 1. Drop the problematic function
DROP FUNCTION IF EXISTS public.get_all_users_simple();

-- 2. Create the function with correct types
CREATE OR REPLACE FUNCTION public.get_all_users_simple()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
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

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users_simple TO authenticated;

-- 4. Test the function
SELECT * FROM public.get_all_users_simple() LIMIT 5;
