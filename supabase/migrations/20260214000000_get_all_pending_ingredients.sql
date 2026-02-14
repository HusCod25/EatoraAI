-- Function to return all pending ingredients for admins
-- Mirrors the security pattern used in get_all_users_simple

CREATE OR REPLACE FUNCTION public.get_all_pending_ingredients()
RETURNS SETOF public.pending_ingredients
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Verify admin access server-side
  SELECT EXISTS(
    SELECT 1 FROM public.user_subscriptions 
    WHERE user_id = auth.uid() AND plan = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Return all pending ingredients ordered by newest first
  RETURN QUERY
  SELECT *
  FROM public.pending_ingredients
  WHERE status = 'pending'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to call the function;
-- the function itself enforces admin access.
GRANT EXECUTE ON FUNCTION public.get_all_pending_ingredients() TO authenticated;

COMMENT ON FUNCTION public.get_all_pending_ingredients IS 'Returns all pending ingredients for admin users. Verifies admin privileges server-side.';
