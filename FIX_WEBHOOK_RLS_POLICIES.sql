-- Fix RLS policies to allow webhook (service role) to update subscriptions
-- Service role should bypass RLS, but let's ensure webhook can update subscriptions

-- 1. Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions';

-- 2. Service role should bypass RLS automatically, but let's ensure
-- that the webhook can update subscriptions by checking if service role is used correctly
-- Service role key in Supabase ALWAYS bypasses RLS, so this should work

-- 3. However, if there are issues, we can add a policy that allows service role
-- But actually, service role bypasses RLS completely, so this shouldn't be needed

-- 4. Let's verify that webhook is using service role correctly
-- The webhook should use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- 5. If webhook still doesn't work, check if there's a constraint issue
-- Let's make sure the update can happen by checking constraints

-- Test query to verify service role can update (run this with service role key)
-- UPDATE user_subscriptions 
-- SET plan = 'beginner', source = 'stripe', subscription_status = 'active'
-- WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;

-- 6. Check if there are any triggers that might be blocking
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_subscriptions';

-- 7. Verify RLS is enabled (it should be, but let's check)
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'user_subscriptions';

-- 8. If RLS is blocking, we can temporarily disable it for testing
-- BUT DON'T DO THIS IN PRODUCTION - service role should bypass RLS
-- ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;

-- 9. The real solution: Ensure webhook uses service role key correctly
-- Service role key ALWAYS bypasses RLS in Supabase
-- If webhook still fails, the issue is likely:
--   a) Service role key not set correctly in environment variables
--   b) Webhook not actually reaching the code (401 error)
--   c) Some other error in the webhook code

-- 10. For debugging: Check if service role can read/write
-- Run this with service role key to verify it works:
SELECT 
  'Testing service role access' as test,
  COUNT(*) as total_subscriptions
FROM user_subscriptions;

-- 11. Final check: Make sure no policies are too restrictive
-- The existing policies should allow:
--   - Users to manage own subscriptions ✓
--   - Admins to manage all subscriptions ✓
--   - Service role bypasses ALL policies ✓

