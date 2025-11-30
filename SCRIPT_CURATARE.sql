-- Script SQL pentru curățare database Supabase
-- Rulează acest script pentru a identifica ce poate fi curățat

-- ============================================
-- 1. VERIFICARE FUNCȚII NEUTILIZATE
-- ============================================
SELECT 'VERIFICARE 1: Funcții în Database' as verificare;

SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name LIKE '%debug%' OR routine_name LIKE '%test%' THEN '⚠️ Posibil temporară'
    ELSE '✅ Probabil utilă'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 2. VERIFICARE INDEXURI (Analiză Detaliată)
-- ============================================
SELECT 'VERIFICARE 2: Indexuri - Analiză Detaliată' as verificare;

-- Verifică dacă indexurile sunt pentru foreign keys, unique constraints sau sunt noi
SELECT 
  i.schemaname,
  i.relname as tablename,
  i.indexrelname as indexname,
  i.idx_scan as index_scans,
  i.idx_tup_read as tuples_read,
  pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
  CASE 
    -- Indexuri pentru primary keys (importante, nu șterge!)
    WHEN i.indexrelname LIKE '%_pkey' THEN '🔒 Primary Key - NU ȘTERGE!'
    -- Indexuri pentru unique constraints (importante, nu șterge!)
    WHEN i.indexrelname LIKE '%_key' OR EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype = 'u'
    ) THEN '🔒 Unique Constraint - NU ȘTERGE!'
    -- Indexuri pentru foreign keys (importante, nu șterge!)
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype = 'f'
    ) THEN '🔗 Foreign Key - NU ȘTERGE!'
    -- Indexuri neutilizate (verifică manual!)
    WHEN i.idx_scan = 0 THEN '⚠️ Neutilizat - Verifică manual înainte de ștergere'
    ELSE '✅ Utilizat'
  END as status,
  -- Adaugă informații despre coloanele indexate
  (SELECT string_agg(attname, ', ' ORDER BY attnum)
   FROM pg_attribute a
   JOIN pg_index idx ON idx.indexrelid = i.indexrelid
   WHERE a.attrelid = i.relid
   AND a.attnum = ANY(idx.indkey)
   AND a.attnum > 0) as indexed_columns
FROM pg_stat_user_indexes i
WHERE i.schemaname = 'public'
ORDER BY 
  CASE 
    WHEN i.indexrelname LIKE '%_pkey' THEN 1
    WHEN i.indexrelname LIKE '%_key' THEN 2
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint c
      WHERE c.conindid = i.indexrelid
      AND c.contype IN ('u', 'f')
    ) THEN 3
    ELSE 4
  END,
  i.idx_scan ASC,
  i.relname,
  i.indexrelname;

-- ============================================
-- 3. VERIFICARE Tabele cu RLS Disabled
-- ============================================
SELECT 'VERIFICARE 3: Tabele fără RLS' as verificare;

SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = false THEN '⚠️ RLS dezactivat - verifică securitatea'
    ELSE '✅ RLS activat'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_%'
ORDER BY rowsecurity, tablename;

-- ============================================
-- 4. VERIFICARE POLICIES DUPLICATE
-- ============================================
SELECT 'VERIFICARE 4: Policies pe Tabele' as verificare;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command_type,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. VERIFICARE TRIGGERS
-- ============================================
SELECT 'VERIFICARE 5: Triggers în Database' as verificare;

SELECT 
  trigger_schema,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 6. VERIFICARE VIEWS
-- ============================================
SELECT 'VERIFICARE 6: Views în Database' as verificare;

SELECT 
  table_schema,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 7. VERIFICARE MATERIALIZED VIEWS
-- ============================================
SELECT 'VERIFICARE 7: Materialized Views' as verificare;

SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- ============================================
-- 8. VERIFICARE EXTENSII
-- ============================================
SELECT 'VERIFICARE 8: Extensii Activate' as verificare;

SELECT 
  extname as extension_name,
  extversion as version
FROM pg_extension
ORDER BY extname;

-- ============================================
-- 9. VERIFICARE CRON JOBS
-- ============================================
SELECT 'VERIFICARE 9: Cron Jobs Configurate' as verificare;

SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename
FROM cron.job
ORDER BY jobname;

-- ============================================
-- 10. SUMAR FINAL
-- ============================================
SELECT '============================================' as separator;
SELECT 'SUMAR FINAL' as titlu;
SELECT '============================================' as separator;

SELECT 
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functii,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0) as indexuri_neutilizate,
  (SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan = 0 
   AND indexrelname NOT LIKE '%_pkey' 
   AND indexrelname NOT LIKE '%_key'
   AND NOT EXISTS (
     SELECT 1 FROM pg_constraint c
     WHERE c.conindid = pg_stat_user_indexes.indexrelid
     AND c.contype IN ('p', 'u', 'f')
   )) as indexuri_safe_de_sters,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false 
   AND tablename NOT LIKE 'pg_%') as tabele_fara_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
  (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') as total_materialized_views,
  (SELECT COUNT(*) FROM cron.job WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')) as total_cron_jobs;

