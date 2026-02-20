-- Migration: Track email confirmation on profiles and auto-cleanup unconfirmed accounts

-- 1) Add email_confirmed_at column on profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- Optional index to help cleanup query
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed_at_created_at
  ON public.profiles(email_confirmed_at, created_at);

COMMENT ON COLUMN public.profiles.email_confirmed_at IS 'Timestamp when the user''s email was confirmed. NULL = never confirmed.';

-- 2) Backfill email_confirmed_at from auth.users for existing users
UPDATE public.profiles p
SET email_confirmed_at = u.email_confirmed_at
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND (p.email_confirmed_at IS NULL OR p.email_confirmed_at <> u.email_confirmed_at);

-- 3) Create trigger function to keep profiles.email_confirmed_at in sync
CREATE OR REPLACE FUNCTION public.mark_profile_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only act when email_confirmed_at becomes non-NULL or changes
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at <> NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET email_confirmed_at = NEW.email_confirmed_at,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Wire trigger on auth.users for email_confirmed_at updates
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_profile_email_confirmed();

-- 5) Function to cleanup unconfirmed accounts older than 5 days
--    This removes profile + related user data for accounts whose email was never confirmed.
CREATE OR REPLACE FUNCTION public.cleanup_unconfirmed_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN
    SELECT user_id
    FROM public.profiles
    WHERE email_confirmed_at IS NULL
      AND created_at < (now() - interval '5 days')
      AND deleted_at IS NULL
  LOOP
    -- Delete related data first (tables may be partially empty for new users)
    DELETE FROM public.generated_meals WHERE user_id = v_profile.user_id;
    DELETE FROM public.saved_meals WHERE user_id = v_profile.user_id;
    DELETE FROM public.user_activity WHERE user_id = v_profile.user_id;
    DELETE FROM public.user_subscriptions WHERE user_id = v_profile.user_id;

    -- Finally delete the profile itself
    DELETE FROM public.profiles WHERE user_id = v_profile.user_id;

    -- NOTE: We are not deleting auth.users here. That requires
    -- calling the GoTrue admin API or auth.delete_user() if exposed.
    -- For spam prevention and DB cleanup, removing app data is sufficient.
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cleanup_unconfirmed_accounts() IS 'Deletes app data for users whose email was never confirmed and whose profile is older than 5 days.';

-- 6) Schedule daily cleanup via pg_cron (if available)
-- This runs once per day at 03:15 UTC.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing job with the same name to avoid duplicates
SELECT cron.unschedule('cleanup-unconfirmed-accounts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-unconfirmed-accounts'
);

-- Schedule the cleanup to run daily
SELECT cron.schedule(
  'cleanup-unconfirmed-accounts',        -- Job name
  '15 3 * * *',                          -- At 03:15 UTC every day
  $$SELECT public.cleanup_unconfirmed_accounts();$$
);

-- Grant minimal permissions for cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_unconfirmed_accounts() TO postgres;
