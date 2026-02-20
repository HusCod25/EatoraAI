-- Extend handle_new_user_complete to restore data if a recently-deleted
-- account with the same email exists in deleted_user_retention.

CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_retention RECORD;
BEGIN
  -- Look for an unexpired retention snapshot for this email
  SELECT * INTO v_retention
  FROM public.deleted_user_retention
  WHERE email = NEW.email
    AND expires_at > now()
    AND restored = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Restore profile using retained data where available
    INSERT INTO public.profiles (
      user_id,
      username,
      email,
      marketing_opt_in,
      terms_accepted_at,
      privacy_accepted_at,
      marketing_consent_at,
      withdrawal_waiver_accepted_at
    )
    VALUES (
      NEW.id,
      COALESCE(
        v_retention.profile_data->>'username',
        NEW.raw_user_meta_data ->> 'username',
        NULL
      ),
      NEW.email,
      COALESCE(
        (v_retention.profile_data->>'marketing_opt_in')::boolean,
        (NEW.raw_user_meta_data ->> 'marketing_opt_in')::boolean,
        false
      ),
      (v_retention.profile_data->>'terms_accepted_at')::timestamptz,
      (v_retention.profile_data->>'privacy_accepted_at')::timestamptz,
      (v_retention.profile_data->>'marketing_consent_at')::timestamptz,
      (v_retention.profile_data->>'withdrawal_waiver_accepted_at')::timestamptz
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Restore subscription or fall back to free
    INSERT INTO public.user_subscriptions (
      user_id,
      plan,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      current_period_end
    )
    VALUES (
      NEW.id,
      COALESCE(
        (v_retention.subscription_data->>'plan')::subscription_plan,
        'free'
      ),
      v_retention.subscription_data->>'stripe_customer_id',
      v_retention.subscription_data->>'stripe_subscription_id',
      COALESCE(
        v_retention.subscription_data->>'subscription_status',
        'active'
      ),
      NULLIF(v_retention.subscription_data->>'current_period_end', '')::timestamptz
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Restore activity counters and weekly limits / cycles
    INSERT INTO public.user_activity (
      user_id,
      meals_generated,
      saved_recipes,
      weekly_meals_used,
      weekly_reset_date,
      subscription_cycle_start_date
    )
    VALUES (
      NEW.id,
      COALESCE((v_retention.activity_data->>'meals_generated')::integer, 0),
      COALESCE((v_retention.activity_data->>'saved_recipes')::integer, 0),
      COALESCE((v_retention.activity_data->>'weekly_meals_used')::integer, 0),
      COALESCE(
        NULLIF(v_retention.activity_data->>'weekly_reset_date', '')::date,
        CURRENT_DATE
      ),
      COALESCE(
        NULLIF(v_retention.activity_data->>'subscription_cycle_start_date', '')::date,
        CURRENT_DATE
      )
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Restore saved meals if any were retained
    IF v_retention.saved_meals_data IS NOT NULL THEN
      INSERT INTO public.saved_meals (
        id,
        user_id,
        title,
        description,
        ingredients,
        preparation_method,
        cooking_time,
        calories,
        tags,
        created_at,
        saved_from_generated_id
      )
      SELECT
        COALESCE((meal->>'id')::uuid, gen_random_uuid()),
        NEW.id,
        meal->>'title',
        meal->>'description',
        meal->'ingredients',
        meal->>'preparation_method',
        NULLIF(meal->>'cooking_time', '')::integer,
        NULLIF(meal->>'calories', '')::integer,
        (meal->'tags')::text[],
        NULLIF(meal->>'created_at', '')::timestamptz,
        NULLIF(meal->>'saved_from_generated_id', '')::uuid
      FROM jsonb_array_elements(v_retention.saved_meals_data) AS meal;
    END IF;

    -- Mark retention record as used so it won't apply again
    UPDATE public.deleted_user_retention
    SET restored = true
    WHERE id = v_retention.id;

    RETURN NEW;
  END IF;

  -- Default path: no retention snapshot, behave like existing GDPR-aware logic
  INSERT INTO public.profiles (
    user_id,
    username,
    email,
    marketing_opt_in,
    terms_accepted_at,
    privacy_accepted_at,
    marketing_consent_at,
    withdrawal_waiver_accepted_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    CASE WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now() ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'privacy_accepted' = 'true' THEN now() ELSE NULL END,
    CASE WHEN (NEW.raw_user_meta_data ->> 'marketing_opt_in')::boolean = true THEN now() ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data ->> 'withdrawal_waiver_accepted' = 'true' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_subscriptions (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_activity (
    user_id,
    meals_generated,
    saved_recipes,
    weekly_meals_used,
    weekly_reset_date,
    subscription_cycle_start_date
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    CURRENT_DATE,
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user_complete for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;
