-- Fix: Verifică și creează constraint UNIQUE pe user_id în profiles
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică constraint-urile pe tabela profiles
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
ORDER BY contype, conname;

-- 2. Verifică structura tabelei profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Creează constraint UNIQUE pe user_id dacă nu există
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.profiles'::regclass 
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%'
  ) THEN
    -- Creează constraint UNIQUE pe user_id
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    
    RAISE NOTICE 'Constraint UNIQUE pe user_id creat pentru profiles';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE pe user_id există deja pentru profiles';
  END IF;
END $$;

-- 4. Verifică din nou constraint-urile
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
ORDER BY contype, conname;

