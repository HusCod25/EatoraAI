-- Verify your admin status
-- Run these queries to confirm everything is working

-- 1. Check your current subscription/plan
SELECT 
  plan,
  source,
  subscription_status,
  granted_by,
  granted_at
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 2. Test admin function (should return true)
SELECT EXISTS(
  SELECT 1 FROM user_subscriptions 
  WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid 
  AND plan = 'admin'
) as is_admin;

-- 3. List all users (admin view)
SELECT 
  u.email,
  u.created_at,
  s.plan,
  s.source,
  s.subscription_status
FROM auth.users u
LEFT JOIN user_subscriptions s ON u.id = s.user_id
ORDER BY u.created_at DESC
LIMIT 10;
