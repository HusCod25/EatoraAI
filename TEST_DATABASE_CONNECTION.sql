-- Test database connection and your admin status
-- Run this to verify everything is working

-- 1. Check if your user exists in auth.users
SELECT 
  'User exists in auth.users' as test,
  id,
  email,
  created_at
FROM auth.users 
WHERE id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 2. Check your subscription record
SELECT 
  'Subscription record exists' as test,
  user_id,
  plan,
  source,
  subscription_status,
  granted_by,
  granted_at
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 3. Test the exact query the app uses
SELECT 
  'App query test' as test,
  plan, 
  subscription_status, 
  current_period_end
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;

-- 4. Check if plan_limits table has admin plan
SELECT 
  'Admin plan limits exist' as test,
  plan,
  meals_per_week,
  has_advanced_recipes,
  has_personalized_suggestions,
  has_personalized_themes
FROM plan_limits 
WHERE plan = 'admin';
