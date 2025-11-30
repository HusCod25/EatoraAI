-- Verifică constraint-urile pe tabela user_subscriptions
-- Rulează acest script în Supabase SQL Editor

-- 1. Verifică toate constraint-urile pe tabela user_subscriptions
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_subscriptions'::regclass
ORDER BY contype, conname;

-- 2. Verifică index-urile (UNIQUE creează automat un index)
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public';

-- 3. Verifică structura tabelei
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- 4. Dacă constraint-ul UNIQUE nu există, creează-l
-- DO NOT RUN IF CONSTRAINT EXISTS - check first!
-- ALTER TABLE public.user_subscriptions 
-- ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);

