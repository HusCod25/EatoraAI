-- Migration: Setup automatic cleanup of expired generated meals
-- This creates a cron job that runs every hour to delete expired meals

-- Step 1: Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Remove any existing cron job for cleanup (if exists)
SELECT cron.unschedule('cleanup-expired-generated-meals')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-generated-meals'
);

-- Step 3: Schedule the cleanup function to run every hour
-- This will delete all meals where expires_at < now()
SELECT cron.schedule(
  'cleanup-expired-generated-meals',  -- Job name
  '0 * * * *',                        -- Run every hour at minute 0 (cron format: minute hour day month weekday)
  $$SELECT public.cleanup_expired_generated_meals();$$
);

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_generated_meals() TO postgres;

-- Step 5: Add comment
COMMENT ON FUNCTION public.cleanup_expired_generated_meals() IS 'Deletes expired generated meals (where expires_at < now()). Called automatically every hour via cron job.';

-- Step 6: Grant execute permission to authenticated users (for manual cleanup if needed)
GRANT EXECUTE ON FUNCTION public.cleanup_expired_generated_meals() TO authenticated;

-- Note: If pg_cron extension is not available in your Supabase project,
-- you can manually call this function or set up an external cron job to call it.
-- To manually run cleanup: SELECT public.cleanup_expired_generated_meals();

