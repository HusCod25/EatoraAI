-- Fix ambiguous column references in admin functions
-- This resolves the "column reference is ambiguous" error

-- 1. Drop the problematic function
DROP FUNCTION IF EXISTS public.get_all_users();

-- 2. Create the function with explicit column references
CREATE OR REPLACE FUNCTION public.get_all_users()
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
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin (using explicit table reference)
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = auth.uid() AND us.plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return all users with their subscription data
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
GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;

-- 4. Test the function
SELECT * FROM public.get_all_users() LIMIT 5;
