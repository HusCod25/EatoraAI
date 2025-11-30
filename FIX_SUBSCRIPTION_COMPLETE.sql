-- Fix complet pentru subscription - Verifică și corectează totul
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică constraint-ul UNIQUE pe user_id
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_subscriptions'::regclass
  AND contype = 'u';

-- 2. Creează constraint-ul dacă nu există
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
    
    RAISE NOTICE 'Constraint UNIQUE pe user_id creat';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE pe user_id există deja';
  END IF;
END $$;

-- 3. Verifică și fixează trigger-ul
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Recrează funcția cu error handling complet
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
  INSERT INTO public.user_subscriptions (user_id, plan, subscription_status)
  VALUES (NEW.id, 'free', 'active')
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

-- 5. Creează trigger-ul
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_complete();

-- 6. Verifică că trigger-ul există
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- 7. Verifică utilizatorii fără subscription (pentru debugging)
SELECT 
  u.id,
  u.email,
  u.created_at,
  CASE 
    WHEN us.user_id IS NULL THEN 'NO SUBSCRIPTION - TREBUIE CREAT'
    ELSE 'HAS SUBSCRIPTION'
  END AS status
FROM auth.users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id
WHERE us.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 5;

