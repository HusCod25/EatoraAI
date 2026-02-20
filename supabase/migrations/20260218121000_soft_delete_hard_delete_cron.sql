-- Function to hard-delete users whose profiles were soft-deleted more than 10 days ago

CREATE OR REPLACE FUNCTION public.hard_delete_expired_soft_deleted_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT user_id, deleted_at
    FROM public.profiles
    WHERE deleted_at IS NOT NULL
      AND deleted_at < (now() - interval '10 days')
  LOOP
    -- Delete related data from dependent tables first
    DELETE FROM public.generated_meals WHERE user_id = v_user.user_id;
    DELETE FROM public.saved_meals WHERE user_id = v_user.user_id;
    DELETE FROM public.user_activity WHERE user_id = v_user.user_id;
    DELETE FROM public.user_subscriptions WHERE user_id = v_user.user_id;

    -- Finally, delete profile row itself
    DELETE FROM public.profiles WHERE user_id = v_user.user_id;

    -- Optionally, if you want to also remove the auth user, you can use
    -- the auth schema's delete function via RPC, but that must be set up
    -- separately because plpgsql cannot directly call the GoTrue admin API.
  END LOOP;
END;
$$;

-- Example pg_cron schedule (run daily at 02:00). Execute this once in SQL editor:
-- SELECT cron.schedule(
--   'hard-delete-soft-deleted-users',
--   '0 2 * * *',
--   $$SELECT public.hard_delete_expired_soft_deleted_users();$$
-- );
