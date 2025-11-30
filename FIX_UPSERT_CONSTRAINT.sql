-- Fix: Verifică și creează constraint UNIQUE pentru user_id dacă nu există
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică dacă constraint-ul UNIQUE există
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_subscriptions'::regclass
  AND contype = 'u'  -- u = unique constraint
ORDER BY conname;

-- 2. Dacă NU există constraint UNIQUE pe user_id, creează-l
-- Verifică mai întâi dacă există deja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conrelid = 'public.user_subscriptions'::regclass 
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%'
  ) THEN
    -- Creează constraint UNIQUE pe user_id
    ALTER TABLE public.user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);
    
    RAISE NOTICE 'Constraint UNIQUE pe user_id creat cu succes';
  ELSE
    RAISE NOTICE 'Constraint UNIQUE pe user_id există deja';
  END IF;
END $$;

-- 3. Verifică din nou constraint-urile
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_subscriptions'::regclass
ORDER BY contype, conname;

