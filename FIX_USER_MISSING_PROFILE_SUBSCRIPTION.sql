-- Fix: Creează profil și subscription pentru utilizatorul existent
-- Rulează acest script în Supabase SQL Editor

-- 1. Creează profil pentru utilizatorul fără profil
INSERT INTO public.profiles (user_id, username)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'username', NULL)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Creează subscription pentru utilizatorul fără subscription
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

-- 3. Creează user_activity pentru utilizatorul fără activity
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

-- 4. Verifică că totul a fost creat
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
ORDER BY u.created_at DESC
LIMIT 10;

