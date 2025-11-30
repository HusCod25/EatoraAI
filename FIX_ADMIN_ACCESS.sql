-- Fix admin access to load all users
-- This allows admins to access all user data

-- 1. Drop existing policies that might be blocking admin access
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON public.user_subscriptions;

-- 2. Create new policies that allow admin access
-- Allow users to read their own subscription
CREATE POLICY "user_subscriptions_select_own" 
ON public.user_subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own subscription
CREATE POLICY "user_subscriptions_update_own" 
ON public.user_subscriptions 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow users to insert their own subscription
CREATE POLICY "user_subscriptions_insert_own" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 3. Create a policy for admins to access all subscriptions
CREATE POLICY "admins_can_access_all_subscriptions" 
ON public.user_subscriptions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.plan = 'admin'
  )
);

-- 4. Grant necessary permissions for admin functions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- 5. Test admin access
SELECT 
  'Testing admin access to all users' as test,
  COUNT(*) as total_users
FROM auth.users;

-- 6. Test admin access to subscriptions
SELECT 
  'Testing admin access to subscriptions' as test,
  COUNT(*) as total_subscriptions
FROM user_subscriptions;
