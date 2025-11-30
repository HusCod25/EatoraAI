-- Verifică dacă trigger-ul pentru crearea automată a subscription-ului funcționează
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică dacă trigger-ul există
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- 2. Verifică dacă funcția handle_new_user_complete există
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user_complete';

-- 3. Testează funcția manual (înlocuiește USER_ID cu un ID real)
-- DO NOT RUN THIS - it's just for reference
-- SELECT public.handle_new_user_complete();

-- 4. Verifică dacă există utilizatori fără subscription
SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE 
    WHEN us.user_id IS NULL THEN 'NO SUBSCRIPTION'
    ELSE 'HAS SUBSCRIPTION'
  END AS subscription_status
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 5. Dacă există utilizatori fără subscription, creează-le manual
-- ATENȚIE: Doar pentru testare, nu pentru producție
-- INSERT INTO user_subscriptions (user_id, plan, subscription_status)
-- SELECT 
--   u.id,
--   'free',
--   'active'
-- FROM auth.users u
-- WHERE NOT EXISTS (
--   SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id
-- );

