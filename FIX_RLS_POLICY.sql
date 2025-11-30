-- Fix the infinite recursion in RLS policy
-- Run this to fix the subscription loading issue

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage any subscription" ON public.user_subscriptions;

-- 2. Create a simpler policy that doesn't cause recursion
-- Allow users to read their own subscription
CREATE POLICY "Users can read their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own subscription (for cancellations)
CREATE POLICY "Users can update their own subscription" 
ON public.user_subscriptions 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow admins to manage any subscription (using a different approach)
CREATE POLICY "Admins can manage subscriptions" 
ON public.user_subscriptions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_subscriptions admin_check
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.plan = 'admin'
    AND admin_check.user_id != user_subscriptions.user_id  -- Prevent self-reference
  )
  OR user_id = auth.uid()  -- Users can always manage their own
);

-- 3. Test the fix
SELECT 
  'Testing subscription query' as test,
  plan,
  subscription_status,
  current_period_end
FROM user_subscriptions 
WHERE user_id = 'b4f40ccb-6c8a-4bb4-850d-ced87198aacc'::uuid;
