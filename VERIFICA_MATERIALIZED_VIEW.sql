-- Script de verificare pentru Materialized View ingredients_search_cache
-- Rulează acest script pentru a verifica dacă materialized view-ul funcționează corect

-- 1. Verifică dacă materialized view-ul există
SELECT 'VERIFICARE 1: Materialized View Există' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Materialized view există'
    ELSE '❌ Materialized view lipsește'
  END as status,
  COUNT(*) as view_count
FROM pg_matviews 
WHERE matviewname = 'ingredients_search_cache';

-- 2. Verifică numărul de înregistrări în materialized view
SELECT 'VERIFICARE 2: Număr Înregistrări' as verificare;

SELECT 
  COUNT(*) as total_ingrediente,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Materialized view conține date'
    ELSE '⚠️ Materialized view este gol'
  END as status
FROM public.ingredients_search_cache;

-- 3. Testează search-ul optimizat
SELECT 'VERIFICARE 3: Test Search Optimizat' as verificare;

SELECT 
  COUNT(*) as rezultate_gasite,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Search optimizat funcționează'
    ELSE '⚠️ Search optimizat nu returnează rezultate'
  END as status
FROM public.search_ingredients_optimized('chicken', 5);

-- 4. Verifică dacă funcția de refresh există
SELECT 'VERIFICARE 4: Funcție Refresh' as verificare;

SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Funcția refresh există'
    ELSE '❌ Funcția refresh lipsește'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'refresh_ingredients_search_cache';

-- 5. Compară numărul de ingrediente din tabel vs materialized view
SELECT 'VERIFICARE 5: Comparație Tabel vs Materialized View' as verificare;

SELECT 
  (SELECT COUNT(*) FROM public."Ingredients") as ingrediente_in_tabel,
  (SELECT COUNT(*) FROM public.ingredients_search_cache) as ingrediente_in_view,
  CASE 
    WHEN (SELECT COUNT(*) FROM public."Ingredients") = (SELECT COUNT(*) FROM public.ingredients_search_cache) 
    THEN '✅ Număr de ingrediente corespunde'
    ELSE '⚠️ Număr de ingrediente diferit - trebuie refresh'
  END as status;

-- 6. Testează refresh-ul manual
SELECT 'VERIFICARE 6: Test Refresh Manual' as verificare;

-- Reîmprospătează materialized view
SELECT public.refresh_ingredients_search_cache() as refresh_result;

-- Verifică din nou după refresh
SELECT 
  COUNT(*) as ingrediente_dupa_refresh,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Refresh reușit'
    ELSE '❌ Refresh eșuat'
  END as status
FROM public.ingredients_search_cache;

-- 7. Testează search-ul cu diferite query-uri
SELECT 'VERIFICARE 7: Test Search cu Diferite Query-uri' as verificare;

-- Test 1: Search exact
SELECT 'Test 1: Search exact "chicken"' as test;
SELECT name, calories, protein FROM public.search_ingredients_optimized('chicken', 3);

-- Test 2: Search parțial
SELECT 'Test 2: Search parțial "breast"' as test;
SELECT name, calories, protein FROM public.search_ingredients_optimized('breast', 3);

-- Test 3: Search cu rezultate multiple
SELECT 'Test 3: Search "egg"' as test;
SELECT name, calories, protein FROM public.search_ingredients_optimized('egg', 5);

-- SUMAR FINAL
SELECT '============================================' as separator;
SELECT 'SUMAR FINAL' as titlu;
SELECT '============================================' as separator;

SELECT 
  (SELECT COUNT(*) FROM pg_matviews WHERE matviewname = 'ingredients_search_cache') as view_exista,
  (SELECT COUNT(*) FROM public.ingredients_search_cache) as total_ingrediente,
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name = 'refresh_ingredients_search_cache') as functie_refresh_exista,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_matviews WHERE matviewname = 'ingredients_search_cache') = 1
         AND (SELECT COUNT(*) FROM public.ingredients_search_cache) > 0
         AND (SELECT COUNT(*) FROM information_schema.routines 
              WHERE routine_schema = 'public' 
              AND routine_name = 'refresh_ingredients_search_cache') = 1
    THEN '✅ MATERIALIZED VIEW FUNCȚIONEAZĂ CORECT!'
    ELSE '⚠️ Verifică erorile de mai sus'
  END as status_final;

