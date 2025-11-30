-- Verifică utilizatorii noi și dacă trigger-ul funcționează
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică TOȚI utilizatorii din auth.users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verifică ce utilizatori au profile create
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.id AS profile_id,
  p.username,
  CASE 
    WHEN p.user_id IS NULL THEN 'FĂRĂ PROFIL'
    ELSE 'ARE PROFIL'
  END AS profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Verifică ce utilizatori au subscription creat
SELECT 
  u.id,
  u.email,
  u.created_at,
  us.plan,
  us.subscription_status,
  CASE 
    WHEN us.user_id IS NULL THEN 'FĂRĂ SUBSCRIPTION'
    ELSE 'ARE SUBSCRIPTION'
  END AS subscription_status
FROM auth.users u
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 4. Verifică utilizatorii FĂRĂ profil sau subscription
SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE 
    WHEN p.user_id IS NULL THEN 'FĂRĂ PROFIL'
    ELSE 'ARE PROFIL'
  END AS profile_status,
  CASE 
    WHEN us.user_id IS NULL THEN 'FĂRĂ SUBSCRIPTION'
    ELSE 'ARE SUBSCRIPTION'
  END AS subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
WHERE p.user_id IS NULL OR us.user_id IS NULL
ORDER BY u.created_at DESC;

-- 5. Verifică dacă trigger-ul există
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- 6. Dacă există utilizatori fără profil/subscription, creează-le manual
-- ATENȚIE: Doar pentru utilizatorii existenți, nu pentru viitor
-- Decomentează și rulează doar dacă ai utilizatori fără profil/subscription

/*
-- Creează profile pentru utilizatorii fără profil
INSERT INTO public.profiles (user_id, username)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'username', NULL)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Creează subscription pentru utilizatorii fără subscription
INSERT INTO public.user_subscriptions (user_id, plan, subscription_status)
SELECT 
  u.id,
  'free',
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Creează user_activity pentru utilizatorii fără activity
INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
SELECT 
  u.id,
  0,
  0,
  0,
  CURRENT_DATE
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_activity ua WHERE ua.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
*/

