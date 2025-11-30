-- Test your admin status
-- Run this to verify you have admin privileges

-- 1. Check your subscription record
SELECT 
  user_id,
  plan,
  source,
  subscription_status,
  granted_by,
  granted_at,
  created_at,
  updated_at
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 2. Check if you're in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 3. Test admin function
SELECT 
  'Testing admin check' as test,
  EXISTS(
    SELECT 1 FROM user_subscriptions 
    WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid 
    AND plan = 'admin'
  ) as is_admin;
