-- Fix: Clear cancellation flags for users with free plan
-- This script clears cancellation_requested_at and cancellation_cancelled_at
-- for all users who have the 'free' plan, as free plans shouldn't show cancellation status

UPDATE public.user_subscriptions
SET 
  cancellation_requested_at = NULL,
  cancellation_cancelled_at = NULL,
  updated_at = NOW()
WHERE 
  plan = 'free'
  AND (cancellation_requested_at IS NOT NULL OR cancellation_cancelled_at IS NOT NULL);

-- Verify the fix
SELECT 
  user_id,
  plan,
  subscription_status,
  cancellation_requested_at,
  cancellation_cancelled_at,
  current_period_end
FROM public.user_subscriptions
WHERE plan = 'free'
  AND (cancellation_requested_at IS NOT NULL OR cancellation_cancelled_at IS NOT NULL);

-- If the query above returns no rows, the fix was successful!

