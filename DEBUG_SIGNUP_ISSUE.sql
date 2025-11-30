-- Debug: Verifică de ce nu apar conturile noi în baza de date
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică TOȚI utilizatorii din auth.users (inclusiv cei noi)
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 2. Verifică ce utilizatori au profile
SELECT 
  u.id AS user_id,
  u.email,
  u.created_at AS user_created,
  p.id AS profile_id,
  p.username,
  CASE 
    WHEN p.user_id IS NULL THEN '❌ FĂRĂ PROFIL'
    ELSE '✅ ARE PROFIL'
  END AS profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;

-- 3. Verifică ce utilizatori au subscription
SELECT 
  u.id AS user_id,
  u.email,
  u.created_at AS user_created,
  us.plan,
  us.subscription_status,
  CASE 
    WHEN us.user_id IS NULL THEN '❌ FĂRĂ SUBSCRIPTION'
    ELSE '✅ ARE SUBSCRIPTION'
  END AS subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;

-- 4. Verifică dacă trigger-ul există și este activ
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
ORDER BY trigger_name;

-- 5. Verifică funcția handle_new_user_complete
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user_complete';

-- 6. Verifică utilizatorii fără profil sau subscription (probleme)
SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE 
    WHEN p.user_id IS NULL THEN '❌ FĂRĂ PROFIL'
    ELSE '✅ ARE PROFIL'
  END AS profile_status,
  CASE 
    WHEN us.user_id IS NULL THEN '❌ FĂRĂ SUBSCRIPTION'
    ELSE '✅ ARE SUBSCRIPTION'
  END AS subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
WHERE p.user_id IS NULL OR us.user_id IS NULL
ORDER BY u.created_at DESC;

