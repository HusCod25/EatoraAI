-- Script pentru debug și verificare a abonamentului după checkout Stripe
-- Rulează acest script în Supabase SQL Editor pentru a verifica dacă webhook-ul a actualizat planul

-- 1. Verifică toate abonamentele cu detalii Stripe
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.source,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  us.created_at,
  us.updated_at,
  p.email
FROM user_subscriptions us
LEFT JOIN auth.users u ON u.id = us.user_id
LEFT JOIN profiles p ON p.user_id = us.user_id
ORDER BY us.updated_at DESC
LIMIT 20;

-- 2. Verifică abonamentele Stripe (non-free, non-admin)
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.source,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  p.email
FROM user_subscriptions us
LEFT JOIN profiles p ON p.user_id = us.user_id
WHERE us.source = 'stripe'
  AND us.plan IN ('beginner', 'chef', 'unlimited')
ORDER BY us.updated_at DESC;

-- 3. Verifică abonamentele care au stripe_subscription_id dar planul este 'free' (posibilă problemă)
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.source,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  p.email,
  us.updated_at
FROM user_subscriptions us
LEFT JOIN profiles p ON p.user_id = us.user_id
WHERE us.stripe_subscription_id IS NOT NULL
  AND us.plan = 'free'
ORDER BY us.updated_at DESC;

-- 4. Verifică abonamentele recent actualizate (ultimele 24h)
SELECT 
  us.user_id,
  us.plan,
  us.subscription_status,
  us.source,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  us.updated_at,
  p.email
FROM user_subscriptions us
LEFT JOIN profiles p ON p.user_id = us.user_id
WHERE us.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY us.updated_at DESC;

-- 5. Verifică pentru un user specific (înlocuiește USER_ID cu ID-ul tău)
-- SELECT 
--   us.user_id,
--   us.plan,
--   us.subscription_status,
--   us.source,
--   us.stripe_customer_id,
--   us.stripe_subscription_id,
--   us.current_period_end,
--   us.created_at,
--   us.updated_at,
--   p.email
-- FROM user_subscriptions us
-- LEFT JOIN profiles p ON p.user_id = us.user_id
-- WHERE us.user_id = 'USER_ID_HERE'::uuid;

-- 6. Verifică logurile recente din Edge Functions (dacă ai acces)
-- Această query necesită acces la tabelul de logs
-- SELECT * FROM edge_function_logs 
-- WHERE function_name = 'stripe-webhook'
-- ORDER BY created_at DESC
-- LIMIT 50;

