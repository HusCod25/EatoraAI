-- FIX COMPLET: Rezolvă toate problemele
-- Rulează acest script în Supabase SQL Editor - PAS CU PAS

-- ============================================
-- PASUL 1: Fixează constraint-urile UNIQUE
-- ============================================

-- 1.1. Verifică și creează constraint UNIQUE pe user_id în user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.user_subscriptions'::regclass 
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%'
  ) THEN
    ALTER TABLE public.user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id creat pentru user_subscriptions';
  ELSE
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id există deja pentru user_subscriptions';
  END IF;
END $$;

-- 1.2. Verifică și creează constraint UNIQUE pe user_id în profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id creat pentru profiles';
  ELSE
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id există deja pentru profiles';
  END IF;
END $$;

-- 1.3. Verifică și creează constraint UNIQUE pe user_id în user_activity (IMPORTANT pentru trigger-ul initialize_user_activity_cycle)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.user_activity'::regclass 
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%'
  ) THEN
    ALTER TABLE public.user_activity 
    ADD CONSTRAINT user_activity_user_id_key UNIQUE (user_id);
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id creat pentru user_activity';
  ELSE
    RAISE NOTICE '✅ Constraint UNIQUE pe user_id există deja pentru user_activity';
  END IF;
END $$;

-- ============================================
-- PASUL 2: Fixează trigger-ul pentru utilizatori noi
-- ============================================

-- 2.1. Șterge trigger-ul vechi
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2.2. Recrează funcția cu error handling complet
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Insert profile (dacă nu există)
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert subscription (dacă nu există)
  INSERT INTO public.user_subscriptions (user_id, plan, subscription_status, source)
  VALUES (NEW.id, 'free', 'active', 'manual')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert user activity (dacă nu există)
  INSERT INTO public.user_activity (user_id, meals_generated, saved_recipes, weekly_meals_used, weekly_reset_date)
  VALUES (NEW.id, 0, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error dar nu eșua user creation
    RAISE WARNING 'Error in handle_new_user_complete for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 2.3. Creează trigger-ul
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();

-- 2.4. Verifică că trigger-ul există
SELECT 
  'Trigger status' AS check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Trigger există'
    ELSE '❌ Trigger NU există'
  END AS status
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- ============================================
-- PASUL 3: Creează profil și subscription pentru utilizatorii existenți fără
-- ============================================

-- 3.1. Creează profile pentru utilizatorii fără profil
INSERT INTO public.profiles (user_id, username)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'username', NULL)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 3.2. Creează subscription pentru utilizatorii fără subscription
INSERT INTO public.user_subscriptions (user_id, plan, subscription_status, source)
SELECT 
  u.id,
  'free',
  'active',
  'manual'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 3.3. Creează user_activity pentru utilizatorii fără activity
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

-- ============================================
-- PASUL 4: Verifică că totul este corect
-- ============================================

-- 4.1. Verifică utilizatorii după fix
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
  END AS subscription_status,
  CASE 
    WHEN ua.user_id IS NULL THEN '❌ FĂRĂ ACTIVITY'
    ELSE '✅ ARE ACTIVITY'
  END AS activity_status
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
LEFT JOIN public.user_activity ua ON ua.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 4.2. Verifică dacă mai există utilizatori fără profil sau subscription
SELECT 
  'Utilizatori fără profil sau subscription' AS check_type,
  COUNT(*) AS count
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
WHERE p.user_id IS NULL OR us.user_id IS NULL;

