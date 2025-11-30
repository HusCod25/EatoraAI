-- Script pentru activare pg_cron și configurare cron jobs
-- Rulează acest script în Supabase SQL Editor

-- PASUL 1: Încearcă să activeze pg_cron
DO $$ 
BEGIN
  -- Verifică dacă extensia poate fi activată
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE '✅ pg_cron activat cu succes!';
  EXCEPTION 
    WHEN OTHERS THEN
      RAISE NOTICE '❌ pg_cron nu poate fi activat: %', SQLERRM;
      RAISE NOTICE '💡 Folosește Opțiunea 2: Edge Functions + External Cron Service';
  END;
END $$;

-- PASUL 2: Verifică dacă pg_cron a fost activat
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ pg_cron este activat'
    ELSE '❌ pg_cron nu este disponibil - folosește Opțiunea 2'
  END as status,
  COUNT(*) as extension_count
FROM pg_extension 
WHERE extname = 'pg_cron';

-- PASUL 3: Dacă pg_cron e activat, configurează cron jobs
DO $$ 
BEGIN
  -- Verifică dacă pg_cron există
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    
    -- Șterge job-urile existente (dacă există) pentru a evita duplicate
    BEGIN
      PERFORM cron.unschedule('refresh-ingredients-cache');
    EXCEPTION WHEN OTHERS THEN
      -- Job-ul nu există, continuă
      NULL;
    END;
    
    BEGIN
      PERFORM cron.unschedule('clear-expired-cache');
    EXCEPTION WHEN OTHERS THEN
      -- Job-ul nu există, continuă
      NULL;
    END;

    -- 1. Reîmprospătare Materialized View (zilnic la 2 AM UTC)
    PERFORM cron.schedule(
      'refresh-ingredients-cache',
      '0 2 * * *',
      'SELECT public.refresh_ingredients_search_cache();'
    );
    
    RAISE NOTICE '✅ Cron job "refresh-ingredients-cache" configurat (zilnic la 2 AM UTC)';

    -- 2. Curățare Cache Expirat (zilnic la 3 AM UTC)
    PERFORM cron.schedule(
      'clear-expired-cache',
      '0 3 * * *',
      'SELECT public.clear_expired_cache();'
    );
    
    RAISE NOTICE '✅ Cron job "clear-expired-cache" configurat (zilnic la 3 AM UTC)';
    
  ELSE
    RAISE NOTICE '⚠️ pg_cron nu este disponibil. Vezi GUID_CRON_JOBS.md pentru Opțiunea 2.';
  END IF;
END $$;

-- PASUL 4: Verifică job-urile configurate
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Cron jobs configurate'
    ELSE '❌ Nu există cron jobs configurate'
  END as status,
  COUNT(*) as job_count
FROM cron.job
WHERE jobname IN ('refresh-ingredients-cache', 'clear-expired-cache');

-- PASUL 5: Afișează detalii despre job-urile configurate
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active,
  nodename
FROM cron.job
WHERE jobname IN ('refresh-ingredients-cache', 'clear-expired-cache')
ORDER BY jobname;

