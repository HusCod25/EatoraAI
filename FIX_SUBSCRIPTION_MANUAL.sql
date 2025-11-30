-- Script pentru a verifica și fixa abonamentul manual
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică abonamentul actual
SELECT 
  user_id,
  plan,
  subscription_status,
  source,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end,
  created_at,
  updated_at
FROM user_subscriptions 
WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;

-- 2. Verifică checkout-urile recente în Stripe (nu poți face asta din SQL, dar poți verifica manual)
-- Mergi la Stripe Dashboard → Payments → Checkout sessions
-- Caută ultimul checkout și copiază:
--   - customer_id
--   - subscription_id
--   - metadata.plan

-- 3. Fix manual temporar (dacă știi planul cumpărat)
-- ATENȚIE: Înlocuiește 'beginner' cu planul real cumpărat (beginner, chef, sau unlimited)
-- ATENȚIE: Înlocuiește 'cus_...' cu customer_id-ul din Stripe
-- ATENȚIE: Înlocuiește 'sub_...' cu subscription_id-ul din Stripe

-- UPDATE user_subscriptions
-- SET 
--   plan = 'beginner', -- sau 'chef', 'unlimited'
--   source = 'stripe',
--   subscription_status = 'active',
--   stripe_customer_id = 'cus_...', -- customer_id din Stripe
--   stripe_subscription_id = 'sub_...', -- subscription_id din Stripe
--   current_period_end = NOW() + INTERVAL '30 days',
--   updated_at = NOW()
-- WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;

-- 4. Verifică după update
-- SELECT 
--   user_id,
--   plan,
--   subscription_status,
--   source,
--   stripe_customer_id,
--   stripe_subscription_id
-- FROM user_subscriptions 
-- WHERE user_id = 'abc1c6d3-80db-4ae6-a5ce-8cf870d9bb27'::uuid;

