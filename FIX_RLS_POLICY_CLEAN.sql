-- Clean fix for RLS policy infinite recursion
-- This handles existing policies properly

-- 1. Drop ALL existing policies on user_subscriptions
DROP POLICY IF EXISTS "Admins can manage any subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;

-- 2. Create new, non-recursive policies
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

-- Allow users to insert their own subscription (for new users)
CREATE POLICY "user_subscriptions_insert_own" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- 3. Test the basic query first
SELECT 
  'Testing basic subscription query' as test,
  plan,
  subscription_status,
  current_period_end
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;
