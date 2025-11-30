-- Create admin functions for user management
-- These functions allow admins to access user data safely

-- 1. Create function to get all users (admin only)
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
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
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
    COALESCE(s.plan, 'free') as plan,
    COALESCE(s.source, 'stripe') as source,
    COALESCE(s.subscription_status, 'active') as subscription_status,
    s.current_period_end,
    s.cancellation_requested_at,
    s.granted_by,
    s.granted_at
  FROM auth.users u
  LEFT JOIN public.user_subscriptions s ON u.id = s.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;

-- 3. Test the function
SELECT * FROM public.get_all_users() LIMIT 5;
