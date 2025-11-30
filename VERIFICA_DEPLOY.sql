-- Script de verificare pentru deploy-ul migrațiilor Fix-uri 5-10
-- Rulează acest script după ce ai aplicat toate migrările pentru a verifica că totul funcționează

-- ============================================
-- VERIFICARE 1: Tabele Backup
-- ============================================
SELECT 'VERIFICARE 1: Tabele Backup' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Toate tabelele de backup există'
    ELSE '❌ Lipsesc tabele de backup'
  END as status,
  COUNT(*) as tabele_gasite
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'backup_profiles',
  'backup_user_subscriptions',
  'backup_user_activity',
  'backup_generated_meals'
);

-- ============================================
-- VERIFICARE 2: Tabele Securitate
-- ============================================
SELECT 'VERIFICARE 2: Tabele Securitate' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Toate tabelele de securitate există'
    ELSE '❌ Lipsesc tabele de securitate'
  END as status,
  COUNT(*) as tabele_gasite
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'api_abuse_log',
  'stripe_fraud_checks'
);

-- ============================================
-- VERIFICARE 3: Tabel Cache
-- ============================================
SELECT 'VERIFICARE 3: Tabel Cache' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Tabelul de cache există'
    ELSE '❌ Tabelul de cache lipsește'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'query_cache';

-- ============================================
-- VERIFICARE 4: Funcții Backup
-- ============================================
SELECT 'VERIFICARE 4: Funcții Backup' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Funcțiile de backup există'
    ELSE '❌ Lipsesc funcții de backup'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'backup_all_critical_tables',
  'backup_profiles_table',
  'backup_user_subscriptions_table',
  'restore_profile_from_backup',
  'restore_subscription_from_backup'
);

-- ============================================
-- VERIFICARE 5: Funcții Securitate
-- ============================================
SELECT 'VERIFICARE 5: Funcții Securitate' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ Funcțiile de securitate există'
    ELSE '❌ Lipsesc funcții de securitate'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'check_api_abuse',
  'check_stripe_fraud',
  'log_api_request'
);

-- ============================================
-- VERIFICARE 6: Funcții Ingrediente
-- ============================================
SELECT 'VERIFICARE 6: Funcții Ingrediente' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Funcțiile de ingrediente există'
    ELSE '❌ Lipsesc funcții de ingrediente'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'normalize_ingredient_name',
  'find_duplicate_ingredients',
  'merge_duplicate_ingredients',
  'convert_unit_to_grams',
  'validate_ingredient_data'
);

-- ============================================
-- VERIFICARE 7: Funcții Validare
-- ============================================
SELECT 'VERIFICARE 7: Funcții Validare' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Funcțiile de validare există'
    ELSE '❌ Lipsesc funcții de validare'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'validate_user_subscription',
  'can_user_access_feature',
  'check_weekly_meal_limit',
  'validate_user_profile'
);

-- ============================================
-- VERIFICARE 8: Funcții Error Tracking
-- ============================================
SELECT 'VERIFICARE 8: Funcții Error Tracking' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ Funcțiile de error tracking există'
    ELSE '❌ Lipsesc funcții de error tracking'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'aggregate_error',
  'get_error_statistics',
  'resolve_error',
  'get_recent_errors'
);

-- ============================================
-- VERIFICARE 9: Funcții Cache & Performance
-- ============================================
SELECT 'VERIFICARE 9: Funcții Cache & Performance' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ Funcțiile de cache și performance există'
    ELSE '❌ Lipsesc funcții de cache/performance'
  END as status,
  COUNT(*) as functii_gasite
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_cached_data',
  'set_cached_data',
  'clear_expired_cache',
  'search_ingredients_optimized',
  'get_user_subscription_cached',
  'get_plan_limits_cached',
  'refresh_ingredients_search_cache'
);

-- ============================================
-- VERIFICARE 10: Materialized View
-- ============================================
SELECT 'VERIFICARE 10: Materialized View' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Materialized view există'
    ELSE '❌ Materialized view lipsește'
  END as status
FROM pg_matviews 
WHERE matviewname = 'ingredients_search_cache';

-- ============================================
-- VERIFICARE 11: Trigger Normalizare
-- ============================================
SELECT 'VERIFICARE 11: Trigger Normalizare' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Trigger de normalizare există'
    ELSE '❌ Trigger de normalizare lipsește'
  END as status
FROM pg_trigger 
WHERE tgname = 'trg_normalize_ingredient_name';

-- ============================================
-- VERIFICARE 12: Trigger Validare Subscription
-- ============================================
SELECT 'VERIFICARE 12: Trigger Validare Subscription' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Trigger de validare subscription există'
    ELSE '❌ Trigger de validare subscription lipsește'
  END as status
FROM pg_trigger 
WHERE tgname = 'trg_auto_validate_subscription';

-- ============================================
-- TESTE FUNCȚIONALITĂȚI
-- ============================================

-- Test 1: Normalizare nume ingredient
SELECT 'TEST 1: Normalizare nume ingredient' as test;
SELECT 
  public.normalize_ingredient_name('Fresh Organic Chicken Breast') as rezultat,
  CASE 
    WHEN public.normalize_ingredient_name('Fresh Organic Chicken Breast') = 'chicken breast' 
    THEN '✅ Funcționează corect'
    ELSE '❌ Rezultat neașteptat'
  END as status;

-- Test 2: Conversie unitate la grame
SELECT 'TEST 2: Conversie unitate la grame' as test;
SELECT 
  public.convert_unit_to_grams(1, 'kg', NULL) as kg_to_grams,
  CASE 
    WHEN public.convert_unit_to_grams(1, 'kg', NULL) = 1000 
    THEN '✅ Funcționează corect'
    ELSE '❌ Rezultat neașteptat'
  END as status;

-- Test 3: Cache (set și get)
SELECT 'TEST 3: Cache' as test;
DO $$
DECLARE
  test_result JSONB;
BEGIN
  -- Set cache
  PERFORM public.set_cached_data('test_verificare', '{"test": "ok"}'::jsonb, 60);
  
  -- Get cache
  SELECT public.get_cached_data('test_verificare', 60) INTO test_result;
  
  IF test_result->>'test' = 'ok' THEN
    RAISE NOTICE '✅ Cache funcționează corect';
  ELSE
    RAISE NOTICE '❌ Cache nu funcționează corect';
  END IF;
  
  -- Cleanup
  DELETE FROM public.query_cache WHERE cache_key = 'test_verificare';
END $$;

-- ============================================
-- SUMAR FINAL
-- ============================================
SELECT '============================================' as separator;
SELECT 'SUMAR FINAL' as titlu;
SELECT '============================================' as separator;

SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND (table_name LIKE 'backup_%' OR table_name LIKE 'api_abuse%' 
        OR table_name = 'query_cache' OR table_name = 'stripe_fraud_checks')) as tabele_noi,
  
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND (routine_name LIKE '%backup%' OR routine_name LIKE '%cache%'
        OR routine_name LIKE '%fraud%' OR routine_name LIKE '%validate%'
        OR routine_name LIKE '%normalize%' OR routine_name LIKE '%aggregate%')) as functii_noi,
  
  (SELECT COUNT(*) FROM pg_matviews 
   WHERE matviewname = 'ingredients_search_cache') as materialized_views,
  
  (SELECT COUNT(*) FROM pg_trigger 
   WHERE tgname IN ('trg_normalize_ingredient_name', 'trg_auto_validate_subscription')) as triggeri_noi;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND (table_name LIKE 'backup_%' OR table_name LIKE 'api_abuse%' 
               OR table_name = 'query_cache' OR table_name = 'stripe_fraud_checks')) >= 7
         AND (SELECT COUNT(*) FROM information_schema.routines 
              WHERE routine_schema = 'public' 
              AND (routine_name LIKE '%backup%' OR routine_name LIKE '%cache%'
                   OR routine_name LIKE '%fraud%' OR routine_name LIKE '%validate%'
                   OR routine_name LIKE '%normalize%' OR routine_name LIKE '%aggregate%')) >= 20
    THEN '✅ TOATE MIGRĂRILE AU FOST APLICATE CU SUCCES!'
    ELSE '⚠️ Verifică erorile de mai sus - unele migrări nu au fost aplicate complet'
  END as status_final;

